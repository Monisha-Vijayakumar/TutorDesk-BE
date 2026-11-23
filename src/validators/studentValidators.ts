import { z } from "zod"
import { MIN_MONTHLY_FEE_PAISE } from "../constants/fees.js"
import { GRADES, SUBJECTS } from "../constants/students.js"
import { VALIDATION_MESSAGES } from "../constants/validation.js"
import {
  isoDateField,
  isPaidDateRangeValid,
  optionalEmailField,
  optionalPhoneField,
  paidDateRangeRule,
  paymentSearchParams,
  personNameField,
  requiredPhoneField,
  strongPasswordField,
  wholeRupeeAmountField,
} from "./fieldSchemas.js"

export const studentListQuerySchema = z.object(paymentSearchParams).refine(isPaidDateRangeValid, paidDateRangeRule)

const studentDetailsFields = {
  firstName: personNameField(VALIDATION_MESSAGES.FIRST_NAME_REQUIRED),
  lastName: personNameField(VALIDATION_MESSAGES.LAST_NAME_REQUIRED),
  email: optionalEmailField,
  phone: optionalPhoneField(VALIDATION_MESSAGES.PHONE_INVALID),
  parentName: personNameField(VALIDATION_MESSAGES.PARENT_NAME_REQUIRED),
  parentPhone: requiredPhoneField(VALIDATION_MESSAGES.PARENT_PHONE_REQUIRED, VALIDATION_MESSAGES.PHONE_INVALID),
  grade: z.enum(GRADES, { error: VALIDATION_MESSAGES.GRADE_REQUIRED }),
  subjects: z
    .array(z.enum(SUBJECTS, { error: VALIDATION_MESSAGES.SUBJECT_INVALID }), {
      error: VALIDATION_MESSAGES.SUBJECTS_REQUIRED,
    })
    .min(1, VALIDATION_MESSAGES.SUBJECTS_REQUIRED)
    .transform((subjects) => [...new Set(subjects)]),
  monthlyFee: wholeRupeeAmountField(
    MIN_MONTHLY_FEE_PAISE,
    VALIDATION_MESSAGES.MONTHLY_FEE_REQUIRED,
    VALIDATION_MESSAGES.MONTHLY_FEE_INVALID
  ),
  joinDate: isoDateField(VALIDATION_MESSAGES.JOIN_DATE_REQUIRED),
}

// Every student has a WhatsApp number: the parent's when the student's own is empty (FR-11).
const useParentPhoneWhenEmpty = <Details extends { phone: string | null; parentPhone: string }>(
  details: Details
): Omit<Details, "phone"> & { phone: string } => ({ ...details, phone: details.phone ?? details.parentPhone })

export const createStudentSchema = z
  .object({ ...studentDetailsFields, password: strongPasswordField(VALIDATION_MESSAGES.PASSWORD_REQUIRED) })
  .transform(useParentPhoneWhenEmpty)

export const updateStudentSchema = z.object(studentDetailsFields).transform(useParentPhoneWhenEmpty)
