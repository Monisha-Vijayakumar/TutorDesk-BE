import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { REMINDER_STATUSES } from "../constants/fees.js"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import type { CreateReminderInput, PaymentReminderResponse } from "../interfaces/fee.js"
import { ReminderLog } from "../models/ReminderLog.js"
import { ApiError } from "../utils/ApiError.js"
import { findCurrentFeeRecord, getCalculatedFee, toPaymentReminderResponse } from "./feeService.js"

// FR-37/38: records that the admin opened WhatsApp with a reminder. It sends nothing and is always INITIATED.
// No daily limit for manual reminders; only allowed while something is outstanding.
export const createReminder = async (
  feeId: string,
  { channel, type, contact }: CreateReminderInput,
  adminId: string
): Promise<PaymentReminderResponse> => {
  const feeWithStudent = await findCurrentFeeRecord(feeId)
  const { outstandingAmount } = await getCalculatedFee(feeWithStudent)
  if (outstandingAmount <= 0) {
    throw new ApiError(HTTP_STATUS.CONFLICT, ERROR_MESSAGES.NOTHING_OUTSTANDING)
  }
  const { feeRecord } = feeWithStudent
  const reminder = await ReminderLog.create({
    feeRecordId: feeRecord._id,
    studentId: feeRecord.studentId,
    month: feeRecord.month,
    channel,
    type,
    contact,
    status: REMINDER_STATUSES.INITIATED,
    initiatedBy: adminId,
  })
  return toPaymentReminderResponse(reminder.toObject())
}
