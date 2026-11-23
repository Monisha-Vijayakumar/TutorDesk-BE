import { FEE_COLLECTION_GRANULARITIES, MAX_DAILY_COLLECTION_DAYS } from "../constants/dashboard.js"
import { PAYMENT_STATUSES, PAYMENT_STATUS_ORDER } from "../constants/fees.js"
import type {
  BatchStudentCount,
  DashboardStatsResponse,
  FeeCollectionQuery,
  FeeCollectionResponse,
  PaymentStatusCount,
} from "../interfaces/dashboard.js"
import type { PaymentStatus } from "../interfaces/fee.js"
import { Batch } from "../models/Batch.js"
import { Payment } from "../models/Payment.js"
import { Student } from "../models/Student.js"
import {
  getCurrentMonth,
  getDaysBetween,
  getLastDayOfMonth,
  listDatesBetween,
  listMonthsBetween,
} from "../utils/dates.js"
import { buildStudentFeeRowStages, ensureFeeRecords } from "./feeRecordService.js"

interface StatusTotals {
  _id: PaymentStatus
  count: number
  billedAmount: number
  collectedAmount: number
  outstandingAmount: number
}

interface CollectedPerPeriod {
  _id: string
  collectedAmount: number
}

const ISO_DATE_LENGTH = 10
const MONTH_LENGTH = 7

// This month's fee records (current students who had joined by month end), totalled per status.
const getStatusTotals = async (month: string): Promise<StatusTotals[]> =>
  Student.aggregate<StatusTotals>([
    ...buildStudentFeeRowStages({ month, studentMatch: { joinDate: { $lte: getLastDayOfMonth(month) } } }),
    { $match: { fee: { $ne: null } } },
    {
      $group: {
        _id: "$fee.status",
        count: { $sum: 1 },
        billedAmount: { $sum: "$fee.totalFee" },
        collectedAmount: { $sum: "$fee.paidAmount" },
        outstandingAmount: { $sum: "$fee.outstandingAmount" },
      },
    },
  ])

// Every batch with its number of current students, most students first, then by name.
const getBatchStudentCounts = async (): Promise<BatchStudentCount[]> =>
  Batch.aggregate<BatchStudentCount>([
    {
      $lookup: {
        from: Student.collection.name,
        localField: "studentIds",
        foreignField: "_id",
        pipeline: [{ $match: { deletedAt: null } }, { $project: { _id: 1 } }],
        as: "currentStudents",
      },
    },
    { $project: { _id: 0, batchId: "$_id", name: 1, studentCount: { $size: "$currentStudents" } } },
    { $sort: { studentCount: -1, name: 1 } },
  ])

const sumStatusTotals = (statusTotals: StatusTotals[], getAmount: (totals: StatusTotals) => number): number =>
  statusTotals.reduce((sum, totals) => sum + getAmount(totals), 0)

// All four statuses (0 included), Paid → Overdue. Amount: received for PAID, still to collect for the others.
const toPaymentStatusCounts = (statusTotals: StatusTotals[]): PaymentStatusCount[] =>
  PAYMENT_STATUS_ORDER.map((status) => {
    const totals = statusTotals.find((statusTotal) => statusTotal._id === status)
    const amount = status === PAYMENT_STATUSES.PAID ? totals?.collectedAmount : totals?.outstandingAmount
    return { status, count: totals?.count ?? 0, amount: amount ?? 0 }
  })

// FR-33: this month at a glance, current students only.
export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
  const month = getCurrentMonth()
  await ensureFeeRecords(month)
  const [statusTotals, totalStudents, totalBatches, batchStudentCounts] = await Promise.all([
    getStatusTotals(month),
    Student.countDocuments({ deletedAt: null }),
    Batch.countDocuments(),
    getBatchStudentCounts(),
  ])
  const overdueTotals = statusTotals.find((totals) => totals._id === PAYMENT_STATUSES.OVERDUE)
  return {
    month,
    summary: {
      totalStudents,
      totalBatches,
      billedAmount: sumStatusTotals(statusTotals, (totals) => totals.billedAmount),
      collectedAmount: sumStatusTotals(statusTotals, (totals) => totals.collectedAmount),
      outstandingAmount: sumStatusTotals(statusTotals, (totals) => totals.outstandingAmount),
      overdueCount: overdueTotals?.count ?? 0,
    },
    paymentStatusCounts: toPaymentStatusCounts(statusTotals),
    batchStudentCounts,
  }
}

// Money received (by payment date, whatever fee month it was for) from current students,
// day by day for ranges up to 62 days, month by month for longer ones. Every period listed, 0 included.
export const getFeeCollection = async ({ from, to }: FeeCollectionQuery): Promise<FeeCollectionResponse> => {
  const months = listMonthsBetween(from, to)
  for (const month of months) {
    await ensureFeeRecords(month)
  }
  const isDaily = getDaysBetween(from, to) + 1 <= MAX_DAILY_COLLECTION_DAYS
  const collectedPerPeriod = await Payment.aggregate<CollectedPerPeriod>([
    { $match: { paidOn: { $gte: from, $lte: to } } },
    {
      $lookup: {
        from: Student.collection.name,
        localField: "studentId",
        foreignField: "_id",
        pipeline: [{ $match: { deletedAt: null } }, { $project: { _id: 1 } }],
        as: "currentStudent",
      },
    },
    { $match: { currentStudent: { $ne: [] } } },
    {
      $group: {
        _id: { $substrCP: ["$paidOn", 0, isDaily ? ISO_DATE_LENGTH : MONTH_LENGTH] },
        collectedAmount: { $sum: "$amount" },
      },
    },
  ])
  const periods = isDaily ? listDatesBetween(from, to) : months
  const points = periods.map((period) => ({
    period,
    collectedAmount: collectedPerPeriod.find((collected) => collected._id === period)?.collectedAmount ?? 0,
  }))
  return {
    from,
    to,
    granularity: isDaily ? FEE_COLLECTION_GRANULARITIES.DAY : FEE_COLLECTION_GRANULARITIES.MONTH,
    collectedAmount: points.reduce((sum, point) => sum + point.collectedAmount, 0),
    points,
  }
}
