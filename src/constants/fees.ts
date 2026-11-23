// Same enum values as the FE's src/constants/fees.ts.
export const PAYMENT_STATUSES = {
  PAID: "PAID",
  PENDING: "PENDING",
  OVERDUE: "OVERDUE",
  PARTIAL: "PARTIAL",
} as const

// Dashboard order: best to worst.
export const PAYMENT_STATUS_ORDER = [
  PAYMENT_STATUSES.PAID,
  PAYMENT_STATUSES.PARTIAL,
  PAYMENT_STATUSES.PENDING,
  PAYMENT_STATUSES.OVERDUE,
] as const

export const PAYMENT_METHODS = {
  CASH: "CASH",
  UPI: "UPI",
  BANK_TRANSFER: "BANK_TRANSFER",
  CARD: "CARD",
  OTHER: "OTHER",
} as const

export const REMINDER_CHANNELS = {
  WHATSAPP: "WHATSAPP",
  EMAIL: "EMAIL",
} as const

export const REMINDER_TYPES = {
  MANUAL: "MANUAL",
  UPCOMING: "UPCOMING",
  DUE: "DUE",
  FIRST_OVERDUE: "FIRST_OVERDUE",
  SECOND_OVERDUE: "SECOND_OVERDUE",
} as const

// A manual WhatsApp reminder is only ever INITIATED: the BE can't know whether the admin pressed Send.
export const REMINDER_STATUSES = {
  INITIATED: "INITIATED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  UNKNOWN: "UNKNOWN",
} as const

// Money is stored in paise; amounts are whole rupees.
export const PAISE_PER_RUPEE = 100
export const MIN_MONTHLY_FEE_PAISE = 100
export const MAX_FEE_PAISE = 10_000_000
export const MIN_TOTAL_FEE_PAISE = 0
export const MIN_PAYMENT_PAISE = 100

export const DEFAULT_FEE_DUE_DAY = 10
export const MIN_FEE_DUE_DAY = 1
export const MAX_FEE_DUE_DAY = 28
