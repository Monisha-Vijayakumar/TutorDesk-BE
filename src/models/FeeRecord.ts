import { model, Schema } from "mongoose"
import type { FeeRecordDocument } from "../interfaces/fee.js"
import { hideInternalFields, uuidIdField } from "../utils/mongo.js"

// One per student per month, created on demand (§13.7). Paid / outstanding / status are calculated, never stored.
const feeRecordSchema = new Schema<FeeRecordDocument>(
  {
    _id: uuidIdField,
    studentId: { type: String, ref: "Student", required: true },
    month: { type: String, required: true },
    totalFee: { type: Number, required: true },
    dueDate: { type: String, required: true },
    updatedBy: { type: String, ref: "User", default: null },
  },
  { timestamps: true, ...hideInternalFields }
)

feeRecordSchema.index({ studentId: 1, month: 1 }, { unique: true })
feeRecordSchema.index({ month: 1 })

export const FeeRecord = model<FeeRecordDocument>("FeeRecord", feeRecordSchema)
