import type { z } from "zod"
import type { batchListQuerySchema, batchSchema } from "../validators/batchValidators.js"

// Stored Batch document (REQUIREMENTS §6). Hard-deleted.
export interface BatchRecord {
  _id: string
  name: string
  description: string | null
  startTime: string | null
  endTime: string | null
  studentIds: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface BatchTimeSlot {
  startTime: string
  endTime: string
}

export interface BatchSummaryResponse {
  id: string
  name: string
  description: string | null
  startTime: string | null
  endTime: string | null
  studentCount: number
  createdAt: string
}

export interface BatchStudentResponse {
  id: string
  studentCode: string
  firstName: string
  lastName: string
}

export interface BatchResponse extends BatchSummaryResponse {
  students: BatchStudentResponse[]
}

export type BatchListQuery = z.infer<typeof batchListQuerySchema>
export type BatchInput = z.infer<typeof batchSchema>
