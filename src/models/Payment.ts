import { model, Schema } from "mongoose"
import { PAYMENT_METHODS } from "../constants/fees.js"
import type { PaymentRecord } from "../interfaces/fee.js"
import { hideInternalFields, uuidIdField } from "../utils/mongo.js"

// One document per payment received — never edited or deleted. createdAt is the "recorded at" time.
const paymentSchema = new Schema<PaymentRecord>(
  {
    _id: uuidIdField,
    feeRecordId: { type: String, ref: "FeeRecord", required: true },
    studentId: { type: String, ref: "Student", required: true },
    month: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    paidOn: { type: String, required: true },
    method: { type: String, enum: Object.values(PAYMENT_METHODS), required: true },
    recordedBy: { type: String, ref: "User", required: true },
    recordedByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, ...hideInternalFields }
)

paymentSchema.index({ feeRecordId: 1 })
paymentSchema.index({ studentId: 1, paidOn: -1, createdAt: -1 })
paymentSchema.index({ paidOn: 1 })

export const Payment = model<PaymentRecord>("Payment", paymentSchema)
