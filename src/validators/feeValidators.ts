import { z } from "zod"
import {
  MIN_PAYMENT_PAISE,
  MIN_TOTAL_FEE_PAISE,
  PAYMENT_METHODS,
  REMINDER_CHANNELS,
  REMINDER_TYPES,
} from "../constants/fees.js"
import { MONTH_PATTERN, VALIDATION_MESSAGES } from "../constants/validation.js"
import { getCurrentMonth, getTodayIsoDate } from "../utils/dates.js"
import {
  isoDateField,
  isPaidDateRangeValid,
  paidDateRangeRule,
  paymentSearchParams,
  requiredText,
  wholeRupeeAmountField,
} from "./fieldSchemas.js"

export const feeListQuerySchema = z
  .object({
    month: requiredText(VALIDATION_MESSAGES.MONTH_INVALID)
      .regex(MONTH_PATTERN, VALIDATION_MESSAGES.MONTH_INVALID)
      .refine((month) => month <= getCurrentMonth(), VALIDATION_MESSAGES.MONTH_IN_FUTURE),
    ...paymentSearchParams,
  })
  .refine(isPaidDateRangeValid, paidDateRangeRule)

const paymentSchema = z.object({
  amount: wholeRupeeAmountField(
    MIN_PAYMENT_PAISE,
    VALIDATION_MESSAGES.PAYMENT_AMOUNT_INVALID,
    VALIDATION_MESSAGES.PAYMENT_AMOUNT_INVALID
  ),
  paidOn: isoDateField(VALIDATION_MESSAGES.PAYMENT_DATE_REQUIRED).refine(
    (paidOn) => paidOn <= getTodayIsoDate(),
    VALIDATION_MESSAGES.PAYMENT_DATE_IN_FUTURE
  ),
  method: z.enum(Object.values(PAYMENT_METHODS), { error: VALIDATION_MESSAGES.PAYMENT_METHOD_REQUIRED }),
})

export const updateFeeSchema = z.object({
  totalFee: wholeRupeeAmountField(
    MIN_TOTAL_FEE_PAISE,
    VALIDATION_MESSAGES.TOTAL_FEE_REQUIRED,
    VALIDATION_MESSAGES.TOTAL_FEE_INVALID
  ),
  dueDate: isoDateField(VALIDATION_MESSAGES.DUE_DATE_REQUIRED),
  payment: paymentSchema.nullable().default(null),
})

// Only manual WhatsApp reminders are recorded for now (FR-37); automated ones come later.
export const createReminderSchema = z.object({
  channel: z.literal(REMINDER_CHANNELS.WHATSAPP, { error: VALIDATION_MESSAGES.REMINDER_CHANNEL_INVALID }),
  type: z.literal(REMINDER_TYPES.MANUAL, { error: VALIDATION_MESSAGES.REMINDER_TYPE_INVALID }),
  contact: requiredText(VALIDATION_MESSAGES.CONTACT_REQUIRED),
})
