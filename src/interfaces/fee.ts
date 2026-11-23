import type { z } from "zod"
import type {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  REMINDER_CHANNELS,
  REMINDER_STATUSES,
  REMINDER_TYPES,
} from "../constants/fees.js"
import type { createReminderSchema, feeListQuerySchema, updateFeeSchema } from "../validators/feeValidators.js"

export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES]
export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]
export type ReminderChannel = (typeof REMINDER_CHANNELS)[keyof typeof REMINDER_CHANNELS]
export type ReminderType = (typeof REMINDER_TYPES)[keyof typeof REMINDER_TYPES]
export type ReminderStatus = (typeof REMINDER_STATUSES)[keyof typeof REMINDER_STATUSES]

// Stored documents (REQUIREMENTS §6). Paid / outstanding / status are calculated, never stored.
export interface FeeRecordDocument {
  _id: string
  studentId: string
  month: string
  totalFee: number
  dueDate: string
  updatedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PaymentRecord {
  _id: string
  feeRecordId: string
  studentId: string
  month: string
  amount: number
  paidOn: string
  method: PaymentMethod
  recordedBy: string
  recordedByName: string
  createdAt: Date
}

export interface ReminderLogRecord {
  _id: string
  feeRecordId: string
  studentId: string
  month: string
  channel: ReminderChannel
  type: ReminderType
  contact: string
  status: ReminderStatus
  initiatedBy: string | null
  createdAt: Date
}

// A month's fee record with the values the BE calculates from its payments (§13.7).
export interface CalculatedFee {
  id: string
  month: string
  totalFee: number
  dueDate: string
  paidAmount: number
  outstandingAmount: number
  status: PaymentStatus
  lastPaymentDate: string | null
  lastPaymentMethod: PaymentMethod | null
}

// Filters shared by the Students and Fees lists.
export interface PaymentFilters {
  search?: string
  paymentStatus?: PaymentStatus
  paidFrom?: string
  paidTo?: string
}

export interface FeeStudentResponse {
  id: string
  studentCode: string
  firstName: string
  lastName: string
  parentName: string
  parentPhone: string
}

export interface FeeRecordResponse {
  id: string
  month: string
  student: FeeStudentResponse
  totalFee: number
  paidAmount: number
  outstandingAmount: number
  status: PaymentStatus
  dueDate: string
  lastPaymentDate: string | null
  lastPaymentMethod: PaymentMethod | null
}

export interface PaymentTransactionResponse {
  id: string
  month: string
  amount: number
  paidOn: string
  method: PaymentMethod
  recordedAt: string
  recordedBy: string
}

export interface PaymentReminderResponse {
  id: string
  month: string
  channel: ReminderChannel
  type: ReminderType
  contact: string
  status: ReminderStatus
  initiatedAt: string
}

export interface PaymentHistoryResponse {
  payments: PaymentTransactionResponse[]
  reminders: PaymentReminderResponse[]
}

export type FeeListQuery = z.infer<typeof feeListQuerySchema>
export type UpdateFeeInput = z.infer<typeof updateFeeSchema>
export type CreateReminderInput = z.infer<typeof createReminderSchema>
