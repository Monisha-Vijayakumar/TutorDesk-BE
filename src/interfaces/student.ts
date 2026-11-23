import type { z } from "zod"
import type {
  createStudentSchema,
  studentListQuerySchema,
  updateStudentSchema,
} from "../validators/studentValidators.js"
import type { CalculatedFee, PaymentMethod, PaymentStatus } from "./fee.js"

// Stored Student document (REQUIREMENTS §6). Deleted = deletedAt set (soft delete).
export interface StudentRecord {
  _id: string
  studentCode: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  parentName: string
  parentPhone: string
  grade: string
  subjects: string[]
  monthlyFee: number
  joinDate: string
  deletedAt: Date | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// One row of the student/fee aggregation: the student plus that month's calculated fee (null when none).
export interface StudentFeeRow extends StudentRecord {
  fee: CalculatedFee | null
}

export interface StudentPaymentSummary {
  status: PaymentStatus
  paidOn: string | null
  method: PaymentMethod | null
}

export interface StudentResponse {
  id: string
  studentCode: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  parentName: string
  parentPhone: string
  grade: string
  subjects: string[]
  monthlyFee: number
  joinDate: string
  createdAt: string
  currentPayment: StudentPaymentSummary
}

export type StudentListQuery = z.infer<typeof studentListQuerySchema>
export type CreateStudentInput = z.infer<typeof createStudentSchema>
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>
