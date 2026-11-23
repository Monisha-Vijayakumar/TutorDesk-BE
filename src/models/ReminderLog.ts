import { model, Schema } from "mongoose"
import { REMINDER_CHANNELS, REMINDER_STATUSES, REMINDER_TYPES } from "../constants/fees.js"
import type { ReminderLogRecord } from "../interfaces/fee.js"
import { hideInternalFields, uuidIdField } from "../utils/mongo.js"

// Every payment-reminder initiation (FR-38). createdAt is the "initiated at" time.
// The unique index against duplicate automated reminders (FR-40) comes with the automated reminders.
const reminderLogSchema = new Schema<ReminderLogRecord>(
  {
    _id: uuidIdField,
    feeRecordId: { type: String, ref: "FeeRecord", required: true },
    studentId: { type: String, ref: "Student", required: true },
    month: { type: String, required: true },
    channel: { type: String, enum: Object.values(REMINDER_CHANNELS), required: true },
    type: { type: String, enum: Object.values(REMINDER_TYPES), required: true },
    contact: { type: String, required: true },
    status: { type: String, enum: Object.values(REMINDER_STATUSES), required: true },
    initiatedBy: { type: String, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, ...hideInternalFields }
)

reminderLogSchema.index({ studentId: 1, createdAt: -1 })

export const ReminderLog = model<ReminderLogRecord>("ReminderLog", reminderLogSchema)
