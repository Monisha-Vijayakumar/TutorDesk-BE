import validator from "validator"
import { z } from "zod"
import { MAX_FEE_PAISE, PAISE_PER_RUPEE, PAYMENT_STATUSES } from "../constants/fees.js"
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants/pagination.js"
import {
  ALPHA_LOCALE,
  ALPHA_WITH_PUNCTUATION_OPTIONS,
  ALPHA_WITH_SPACES_OPTIONS,
  ISO_DATE_FORMAT,
  PHONE_LOCALE,
  PHONE_SEPARATORS,
  VALIDATION_MESSAGES,
} from "../constants/validation.js"

// Sanitise → validate, the same rules the FE applies (REQUIREMENTS §13.6, NFR-16/17).
// Strings are trimmed; passwords are never changed.

const isMissing = (input: unknown): boolean => input === undefined || input === null

// "Required" when the field is missing, "invalid" when it has the wrong type.
const requiredOrInvalid =
  (requiredMessage: string, invalidMessage: string) =>
  (issue: { input?: unknown }): string =>
    isMissing(issue.input) ? requiredMessage : invalidMessage

const isLettersAndSpaces = (value: string): boolean => validator.isAlpha(value, ALPHA_LOCALE, ALPHA_WITH_SPACES_OPTIONS)

const isLettersAndPunctuation = (value: string): boolean =>
  validator.isAlpha(value, ALPHA_LOCALE, ALPHA_WITH_PUNCTUATION_OPTIONS)

const isIndianMobileNumber = (value: string): boolean => validator.isMobilePhone(value, PHONE_LOCALE)

const removePhoneSeparators = (value: string): string => validator.blacklist(value.trim(), PHONE_SEPARATORS)

export const isIsoDate = (value: string): boolean =>
  validator.isDate(value, { format: ISO_DATE_FORMAT, strictMode: true, delimiters: ["-"] })

export const requiredText = (requiredMessage: string): z.ZodString =>
  z.string({ error: requiredMessage }).trim().min(1, requiredMessage)

export const personNameField = (requiredMessage: string): z.ZodString =>
  requiredText(requiredMessage).refine(isLettersAndSpaces, VALIDATION_MESSAGES.LETTERS_ONLY)

export const centerNameField = (requiredMessage: string): z.ZodString =>
  requiredText(requiredMessage).refine(isLettersAndPunctuation, VALIDATION_MESSAGES.LETTERS_AND_PUNCTUATION_ONLY)

// Optional text: empty after trimming becomes null.
export const optionalTextField = (): z.ZodType<string | null, string | null | undefined> =>
  z
    .string()
    .trim()
    .nullish()
    .transform((value) => value || null)

export const optionalBranchField = optionalTextField().refine(
  (value) => value === null || isLettersAndPunctuation(value),
  VALIDATION_MESSAGES.LETTERS_AND_PUNCTUATION_ONLY
)

export const optionalEmailField = z
  .string({ error: VALIDATION_MESSAGES.EMAIL_INVALID })
  .trim()
  .toLowerCase()
  .nullish()
  .transform((value) => value || null)
  .refine((value) => value === null || validator.isEmail(value), VALIDATION_MESSAGES.EMAIL_INVALID)

export const requiredPhoneField = (requiredMessage: string, invalidMessage: string): z.ZodType<string, string> =>
  z
    .string({ error: requiredMessage })
    .transform(removePhoneSeparators)
    .refine((value) => value.length > 0, { message: requiredMessage, abort: true })
    .refine(isIndianMobileNumber, invalidMessage)

export const optionalPhoneField = (invalidMessage: string): z.ZodType<string | null, string | null | undefined> =>
  z
    .string({ error: invalidMessage })
    .nullish()
    .transform((value) => removePhoneSeparators(value ?? "") || null)
    .refine((value) => value === null || isIndianMobileNumber(value), invalidMessage)

export const isoDateField = (requiredMessage: string): z.ZodString =>
  requiredText(requiredMessage).refine(isIsoDate, VALIDATION_MESSAGES.DATE_INVALID)

export const passwordField = (requiredMessage: string): z.ZodString =>
  z.string({ error: requiredMessage }).min(1, requiredMessage)

export const strongPasswordField = (requiredMessage: string): z.ZodString =>
  passwordField(requiredMessage).refine(
    (value) => validator.isStrongPassword(value),
    VALIDATION_MESSAGES.PASSWORD_TOO_WEAK
  )

// Money in paise: whole rupees between the limits.
export const wholeRupeeAmountField = (
  minPaise: number,
  requiredMessage: string,
  invalidMessage: string,
  maxPaise = MAX_FEE_PAISE
): z.ZodNumber =>
  z
    .number({ error: requiredOrInvalid(requiredMessage, invalidMessage) })
    .int(invalidMessage)
    .min(minPaise, invalidMessage)
    .max(maxPaise, invalidMessage)
    .multipleOf(PAISE_PER_RUPEE, invalidMessage)

export const integerField = (requiredMessage: string, invalidMessage: string, min: number, max: number): z.ZodNumber =>
  z
    .number({ error: requiredOrInvalid(requiredMessage, invalidMessage) })
    .int(invalidMessage)
    .min(min, invalidMessage)
    .max(max, invalidMessage)

// ---- List query params (strings in the URL; empty ones are left out by the FE) ----

export const optionalSearchParam = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)

export const optionalDateParam = z
  .string({ error: VALIDATION_MESSAGES.DATE_INVALID })
  .trim()
  .refine(isIsoDate, VALIDATION_MESSAGES.DATE_INVALID)
  .optional()

export const paymentStatusParam = z
  .enum(Object.values(PAYMENT_STATUSES), { error: VALIDATION_MESSAGES.PAYMENT_STATUS_INVALID })
  .optional()

export const paginationParams = {
  page: z.coerce
    .number({ error: VALIDATION_MESSAGES.PAGE_INVALID })
    .int(VALIDATION_MESSAGES.PAGE_INVALID)
    .min(1, VALIDATION_MESSAGES.PAGE_INVALID)
    .default(DEFAULT_PAGE),
  limit: z.coerce
    .number({ error: VALIDATION_MESSAGES.LIMIT_INVALID })
    .int(VALIDATION_MESSAGES.LIMIT_INVALID)
    .min(1, VALIDATION_MESSAGES.LIMIT_INVALID)
    .max(MAX_PAGE_SIZE, VALIDATION_MESSAGES.LIMIT_INVALID)
    .default(DEFAULT_PAGE_SIZE),
}

// Search + payment filters + page, shared by GET /students and GET /fees.
export const paymentSearchParams = {
  search: optionalSearchParam,
  paymentStatus: paymentStatusParam,
  paidFrom: optionalDateParam,
  paidTo: optionalDateParam,
  ...paginationParams,
}

interface DateRangeParams {
  paidFrom?: string
  paidTo?: string
}

export const isPaidDateRangeValid = ({ paidFrom, paidTo }: DateRangeParams): boolean =>
  !paidFrom || !paidTo || paidFrom <= paidTo

export const paidDateRangeRule = {
  message: VALIDATION_MESSAGES.DATE_RANGE_INVALID,
  path: ["paidFrom"],
}
