import type { ClientSession } from "mongoose"
import { runInTransaction } from "../config/db.js"
import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import type { AuthUser } from "../interfaces/auth.js"
import type { PaginatedResult } from "../interfaces/common.js"
import type {
  CalculatedFee,
  FeeListQuery,
  FeeRecordDocument,
  FeeRecordResponse,
  PaymentHistoryResponse,
  PaymentReminderResponse,
  ReminderLogRecord,
  UpdateFeeInput,
} from "../interfaces/fee.js"
import type { StudentFeeRow, StudentRecord } from "../interfaces/student.js"
import { FeeRecord } from "../models/FeeRecord.js"
import { Payment } from "../models/Payment.js"
import { ReminderLog } from "../models/ReminderLog.js"
import { Student } from "../models/Student.js"
import { ApiError } from "../utils/ApiError.js"
import { getLastDayOfMonth } from "../utils/dates.js"
import { ensureFeeRecords, findStudentFeeRow, listStudentFeeRows } from "./feeRecordService.js"

// The FeeRecord object of the API (§7).
const toFeeRecordResponse = (student: StudentRecord, fee: CalculatedFee): FeeRecordResponse => ({
  id: fee.id,
  month: fee.month,
  student: {
    id: student._id,
    studentCode: student.studentCode,
    firstName: student.firstName,
    lastName: student.lastName,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
  },
  totalFee: fee.totalFee,
  paidAmount: fee.paidAmount,
  outstandingAmount: fee.outstandingAmount,
  status: fee.status,
  dueDate: fee.dueDate,
  lastPaymentDate: fee.lastPaymentDate,
  lastPaymentMethod: fee.lastPaymentMethod,
})

const toFeeRecordResponses = (rows: StudentFeeRow[]): FeeRecordResponse[] =>
  rows.flatMap(({ fee, ...student }) => (fee ? [toFeeRecordResponse(student, fee)] : []))

export const toPaymentReminderResponse = (reminder: ReminderLogRecord): PaymentReminderResponse => ({
  id: reminder._id,
  month: reminder.month,
  channel: reminder.channel,
  type: reminder.type,
  contact: reminder.contact,
  status: reminder.status,
  initiatedAt: reminder.createdAt.toISOString(),
})

interface FeeWithStudent {
  feeRecord: FeeRecordDocument
  student: StudentRecord
}

// A fee record of a current student; unknown records and deleted students are 404.
export const findCurrentFeeRecord = async (feeId: string): Promise<FeeWithStudent> => {
  const feeRecord = await FeeRecord.findById(feeId).lean()
  const student = feeRecord ? await Student.findOne({ _id: feeRecord.studentId, deletedAt: null }).lean() : null
  if (!feeRecord || !student) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.FEE_NOT_FOUND)
  }
  return { feeRecord, student }
}

// The month's fee record with its calculated paid / outstanding / status.
export const getCalculatedFee = async ({ feeRecord, student }: FeeWithStudent): Promise<FeeRecordResponse> => {
  const row = await findStudentFeeRow(student._id, feeRecord.month)
  if (!row?.fee) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.FEE_NOT_FOUND)
  }
  return toFeeRecordResponse(student, row.fee)
}

// One month: current students who had joined by its last day (FR-23).
export const listFees = async ({
  month,
  page,
  limit,
  ...filters
}: FeeListQuery): Promise<PaginatedResult<FeeRecordResponse>> => {
  await ensureFeeRecords(month)
  const { items, total } = await listStudentFeeRows(
    { month, filters, studentMatch: { joinDate: { $lte: getLastDayOfMonth(month) } } },
    { page, limit }
  )
  return { items: toFeeRecordResponses(items), total }
}

const sumPayments = async (feeRecordId: string, session: ClientSession | undefined): Promise<number> => {
  const [paymentTotal] = await Payment.aggregate<{ amount: number }>([
    { $match: { feeRecordId } },
    { $group: { _id: null, amount: { $sum: "$amount" } } },
  ]).session(session ?? null)
  return paymentTotal?.amount ?? 0
}

// FR-24: new total fee and due date, plus an optional payment stored as its own record (never overwritten).
export const updateFee = async (
  feeId: string,
  { totalFee, dueDate, payment }: UpdateFeeInput,
  admin: AuthUser
): Promise<FeeRecordResponse> => {
  const feeWithStudent = await findCurrentFeeRecord(feeId)
  const { feeRecord } = feeWithStudent
  await runInTransaction(async (session) => {
    const paidAmount = await sumPayments(feeId, session)
    if (totalFee < paidAmount) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.TOTAL_FEE_BELOW_PAID)
    }
    if (payment && payment.amount > totalFee - paidAmount) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.PAYMENT_ABOVE_OUTSTANDING)
    }
    await FeeRecord.updateOne({ _id: feeId }, { totalFee, dueDate, updatedBy: admin._id }, { session })
    if (payment) {
      await Payment.create(
        [
          {
            ...payment,
            feeRecordId: feeId,
            studentId: feeRecord.studentId,
            month: feeRecord.month,
            recordedBy: admin._id,
            recordedByName: admin.name,
          },
        ],
        { session }
      )
    }
  })
  return getCalculatedFee(feeWithStudent)
}

// FR-26a: payments and reminders of every month, newest first, as two separate lists.
export const getPaymentHistory = async (studentId: string): Promise<PaymentHistoryResponse> => {
  const currentStudent = await Student.exists({ _id: studentId, deletedAt: null })
  if (!currentStudent) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.STUDENT_NOT_FOUND)
  }
  const [payments, reminders] = await Promise.all([
    Payment.find({ studentId }).sort({ paidOn: -1, createdAt: -1 }).lean(),
    ReminderLog.find({ studentId }).sort({ createdAt: -1 }).lean(),
  ])
  return {
    payments: payments.map((payment) => ({
      id: payment._id,
      month: payment.month,
      amount: payment.amount,
      paidOn: payment.paidOn,
      method: payment.method,
      recordedAt: payment.createdAt.toISOString(),
      recordedBy: payment.recordedByName,
    })),
    reminders: reminders.map(toPaymentReminderResponse),
  }
}
