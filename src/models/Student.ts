import { model, Schema } from "mongoose"
import { GRADES, SUBJECTS } from "../constants/students.js"
import type { StudentRecord } from "../interfaces/student.js"
import { hideInternalFields, uuidIdField } from "../utils/mongo.js"

// Student profile. Never removed: deleting sets deletedAt (soft delete, FR-13).
const studentSchema = new Schema<StudentRecord>(
  {
    _id: uuidIdField,
    studentCode: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    phone: { type: String, required: true },
    parentName: { type: String, required: true, trim: true },
    parentPhone: { type: String, required: true },
    grade: { type: String, enum: GRADES, required: true },
    subjects: { type: [{ type: String, enum: SUBJECTS }], required: true },
    monthlyFee: { type: Number, required: true },
    joinDate: { type: String, required: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: String, ref: "User", required: true },
  },
  { timestamps: true, ...hideInternalFields }
)

studentSchema.index({ studentCode: 1 }, { unique: true })
studentSchema.index({ deletedAt: 1, createdAt: -1 })
// Email is unique among current students only, so a deleted student's email can be used again.
studentSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" }, deletedAt: { $type: "null" } } }
)

export const Student = model<StudentRecord>("Student", studentSchema)
