import type { z } from "zod"
import type { FEE_COLLECTION_GRANULARITIES } from "../constants/dashboard.js"
import type { feeCollectionQuerySchema } from "../validators/dashboardValidators.js"
import type { PaymentStatus } from "./fee.js"

export interface DashboardSummary {
  totalStudents: number
  totalBatches: number
  billedAmount: number
  collectedAmount: number
  outstandingAmount: number
  overdueCount: number
}

export interface PaymentStatusCount {
  status: PaymentStatus
  count: number
  amount: number
}

export interface BatchStudentCount {
  batchId: string
  name: string
  studentCount: number
}

export interface DashboardStatsResponse {
  month: string
  summary: DashboardSummary
  paymentStatusCounts: PaymentStatusCount[]
  batchStudentCounts: BatchStudentCount[]
}

export type FeeCollectionGranularity = (typeof FEE_COLLECTION_GRANULARITIES)[keyof typeof FEE_COLLECTION_GRANULARITIES]

export interface FeeCollectionPoint {
  period: string
  collectedAmount: number
}

export interface FeeCollectionResponse {
  from: string
  to: string
  granularity: FeeCollectionGranularity
  collectedAmount: number
  points: FeeCollectionPoint[]
}

export type FeeCollectionQuery = z.infer<typeof feeCollectionQuerySchema>
