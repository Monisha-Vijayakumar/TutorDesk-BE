import { randomUUID } from "node:crypto"
import type { PipelineStage } from "mongoose"
import { PAYMENT_STATUSES } from "../constants/fees.js"
import type { PaginatedResult, PaginationQuery } from "../interfaces/common.js"
import type { PaymentFilters } from "../interfaces/fee.js"
import type { StudentFeeRow } from "../interfaces/student.js"
import { FeeRecord } from "../models/FeeRecord.js"
import { Payment } from "../models/Payment.js"
import { Student } from "../models/Student.js"
import { getLastDayOfMonth, getTodayIsoDate } from "../utils/dates.js"
import { calculateDefaultDueDate, calculateDefaultTotalFee } from "../utils/feeCalculations.js"
import { buildContainsRegex, buildPaginationFacet, readPaginationFacet } from "../utils/mongo.js"
import { getAdminFeeDueDay } from "./authService.js"

// Fee records are created on demand (§13.7): before a month is listed, every current student who had joined
// by the end of that month gets one. Upserts + the unique { studentId, month } index make concurrent calls safe.
export const ensureFeeRecords = async (month: string, studentIds?: string[]): Promise<void> => {
  const studentIdsWithRecord = await FeeRecord.distinct("studentId", { month })
  const studentsWithoutRecord = await Student.find({
    _id: { $nin: studentIdsWithRecord, ...(studentIds && { $in: studentIds }) },
    deletedAt: null,
    joinDate: { $lte: getLastDayOfMonth(month) },
  })
    .select("monthlyFee joinDate")
    .lean()
  if (studentsWithoutRecord.length === 0) {
    return
  }
  const feeDueDay = await getAdminFeeDueDay()
  await FeeRecord.bulkWrite(
    studentsWithoutRecord.map((student) => ({
      updateOne: {
        filter: { studentId: student._id, month },
        update: {
          $setOnInsert: {
            _id: randomUUID(),
            totalFee: calculateDefaultTotalFee(student.monthlyFee, student.joinDate, month),
            dueDate: calculateDefaultDueDate(feeDueDay, student.joinDate, month),
            updatedBy: null,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  )
}

// Paid, outstanding, status and the latest payment of one fee record (§13.7, FR-26). `today` is in APP_TIMEZONE.
const buildCalculatedFeeStages = (today: string): PipelineStage.FacetPipelineStage[] => [
  { $lookup: { from: Payment.collection.name, localField: "_id", foreignField: "feeRecordId", as: "payments" } },
  {
    $set: {
      paidAmount: { $sum: "$payments.amount" },
      lastPayment: { $first: { $sortArray: { input: "$payments", sortBy: { paidOn: -1, createdAt: -1 } } } },
    },
  },
  { $set: { outstandingAmount: { $subtract: ["$totalFee", "$paidAmount"] } } },
  {
    $set: {
      status: {
        $switch: {
          branches: [
            { case: { $lte: ["$outstandingAmount", 0] }, then: PAYMENT_STATUSES.PAID },
            { case: { $gt: [today, "$dueDate"] }, then: PAYMENT_STATUSES.OVERDUE },
            { case: { $gt: ["$paidAmount", 0] }, then: PAYMENT_STATUSES.PARTIAL },
          ],
          default: PAYMENT_STATUSES.PENDING,
        },
      },
    },
  },
  {
    $project: {
      _id: 0,
      id: "$_id",
      month: 1,
      totalFee: 1,
      dueDate: 1,
      paidAmount: 1,
      outstandingAmount: 1,
      status: 1,
      lastPaymentDate: { $ifNull: ["$lastPayment.paidOn", null] },
      lastPaymentMethod: { $ifNull: ["$lastPayment.method", null] },
    },
  },
]

// Student ID or full name, partial and case-insensitive (the full name also covers first and last name).
export const buildStudentSearchMatch = (search: string): Record<string, unknown> => {
  const searchRegex = buildContainsRegex(search)
  return {
    $or: [
      { studentCode: searchRegex },
      { $expr: { $regexMatch: { input: { $concat: ["$firstName", " ", "$lastName"] }, regex: searchRegex } } },
    ],
  }
}

// A student without a fee record for the month (joins later) counts as Pending with no payment.
const buildPaymentStatusMatch = (paymentStatus: string): Record<string, unknown> =>
  paymentStatus === PAYMENT_STATUSES.PENDING
    ? { $or: [{ "fee.status": PAYMENT_STATUSES.PENDING }, { fee: null }] }
    : { "fee.status": paymentStatus }

// Students with no payment that month never match a date filter (null fails $gte / $lte on strings).
const buildPaymentDateMatch = (paidFrom?: string, paidTo?: string): Record<string, unknown> => ({
  "fee.lastPaymentDate": { ...(paidFrom && { $gte: paidFrom }), ...(paidTo && { $lte: paidTo }) },
})

interface StudentFeeRowsOptions {
  month: string
  studentMatch?: Record<string, unknown>
  filters?: PaymentFilters
}

// Current students → their fee record for the month with calculated fields → search and payment filters,
// newest students first. Shared by the Students list, the Fees list and the dashboard.
export const buildStudentFeeRowStages = ({
  month,
  studentMatch = {},
  filters = {},
}: StudentFeeRowsOptions): PipelineStage[] => {
  const { search, paymentStatus, paidFrom, paidTo } = filters
  const stages: PipelineStage[] = [
    { $match: { ...studentMatch, deletedAt: null, ...(search && buildStudentSearchMatch(search)) } },
    {
      $lookup: {
        from: FeeRecord.collection.name,
        localField: "_id",
        foreignField: "studentId",
        pipeline: [{ $match: { month } }, ...buildCalculatedFeeStages(getTodayIsoDate())],
        as: "fee",
      },
    },
    { $set: { fee: { $ifNull: [{ $first: "$fee" }, null] } } },
  ]
  if (paymentStatus) {
    stages.push({ $match: buildPaymentStatusMatch(paymentStatus) })
  }
  if (paidFrom || paidTo) {
    stages.push({ $match: buildPaymentDateMatch(paidFrom, paidTo) })
  }
  stages.push({ $sort: { createdAt: -1, _id: -1 } })
  return stages
}

export const listStudentFeeRows = async (
  options: StudentFeeRowsOptions,
  pagination: PaginationQuery
): Promise<PaginatedResult<StudentFeeRow>> => {
  const facetResults = await Student.aggregate([...buildStudentFeeRowStages(options), buildPaginationFacet(pagination)])
  return readPaginationFacet<StudentFeeRow>(facetResults)
}

// One current student with that month's calculated fee, or null when the student is unknown or deleted.
export const findStudentFeeRow = async (studentId: string, month: string): Promise<StudentFeeRow | null> => {
  const [row] = await Student.aggregate<StudentFeeRow>(
    buildStudentFeeRowStages({ month, studentMatch: { _id: studentId } })
  )
  return row ?? null
}
