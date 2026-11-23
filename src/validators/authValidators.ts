import validator from "validator"
import { z } from "zod"
import { MAX_FEE_DUE_DAY, MIN_FEE_DUE_DAY } from "../constants/fees.js"
import { STUDENT_CODE_PATTERN } from "../constants/students.js"
import { MAX_ADDRESS_LENGTH, VALIDATION_MESSAGES } from "../constants/validation.js"
import {
  centerNameField,
  integerField,
  optionalBranchField,
  passwordField,
  personNameField,
  requiredPhoneField,
  requiredText,
  strongPasswordField,
} from "./fieldSchemas.js"

// An email logs in the admin, anything else must be a Student ID (FR-2).
const normaliseIdentifier = (identifier: string): string =>
  identifier.includes("@") ? identifier.toLowerCase() : identifier.toUpperCase()

const isEmailOrStudentCode = (identifier: string): boolean =>
  validator.isEmail(identifier) || STUDENT_CODE_PATTERN.test(identifier)

export const loginSchema = z.object({
  identifier: requiredText(VALIDATION_MESSAGES.LOGIN_IDENTIFIER_REQUIRED)
    .transform(normaliseIdentifier)
    .refine(isEmailOrStudentCode, VALIDATION_MESSAGES.LOGIN_IDENTIFIER_INVALID),
  password: passwordField(VALIDATION_MESSAGES.PASSWORD_REQUIRED),
})

export const changePasswordSchema = z.object({
  currentPassword: passwordField(VALIDATION_MESSAGES.CURRENT_PASSWORD_REQUIRED),
  newPassword: strongPasswordField(VALIDATION_MESSAGES.NEW_PASSWORD_REQUIRED),
})

// Settings → Profile fields (FR-42). Also used by the seeder for the ADMIN_* env vars.
export const profileFields = {
  name: personNameField(VALIDATION_MESSAGES.NAME_REQUIRED),
  phone: requiredPhoneField(VALIDATION_MESSAGES.PHONE_REQUIRED, VALIDATION_MESSAGES.MOBILE_NUMBER_INVALID),
  address: requiredText(VALIDATION_MESSAGES.ADDRESS_REQUIRED).max(
    MAX_ADDRESS_LENGTH,
    VALIDATION_MESSAGES.ADDRESS_TOO_LONG
  ),
  centerName: centerNameField(VALIDATION_MESSAGES.CENTER_NAME_REQUIRED),
  branch: optionalBranchField,
  city: personNameField(VALIDATION_MESSAGES.CITY_REQUIRED),
  state: personNameField(VALIDATION_MESSAGES.STATE_REQUIRED),
  feeDueDay: integerField(
    VALIDATION_MESSAGES.FEE_DUE_DAY_REQUIRED,
    VALIDATION_MESSAGES.FEE_DUE_DAY_INVALID,
    MIN_FEE_DUE_DAY,
    MAX_FEE_DUE_DAY
  ),
}

// Email, role or any unknown field → 422.
export const updateProfileSchema = z.strictObject(profileFields)
