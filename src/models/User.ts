import { model, Schema } from "mongoose"
import { MAX_FEE_DUE_DAY, MIN_FEE_DUE_DAY } from "../constants/fees.js"
import { USER_ROLES } from "../constants/userRoles.js"
import { MAX_ADDRESS_LENGTH } from "../constants/validation.js"
import type { UserRecord } from "../interfaces/auth.js"
import { hideInternalFields, uuidIdField } from "../utils/mongo.js"

// Login accounts: the single admin + one per student. Role-specific fields are null for the other role.
const userSchema = new Schema<UserRecord>(
  {
    _id: uuidIdField,
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: Object.values(USER_ROLES), required: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: null },
    address: { type: String, default: null, maxlength: MAX_ADDRESS_LENGTH },
    centerName: { type: String, default: null },
    branch: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    feeDueDay: { type: Number, default: null, min: MIN_FEE_DUE_DAY, max: MAX_FEE_DUE_DAY },
    studentId: { type: String, ref: "Student", default: null },
    studentCode: { type: String, default: null },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true, ...hideInternalFields }
)

const isAdminFilter = { role: USER_ROLES.ADMIN }

// Only one admin can ever exist; its email is unique.
userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: isAdminFilter })
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: isAdminFilter })
userSchema.index({ studentCode: 1 }, { unique: true, partialFilterExpression: { studentCode: { $type: "string" } } })
userSchema.index({ studentId: 1 }, { unique: true, partialFilterExpression: { studentId: { $type: "string" } } })

export const User = model<UserRecord>("User", userSchema)
