// Same rules and wording as the FE's src/constants/validation.ts (REQUIREMENTS §13.6).

export const ALPHA_LOCALE = "en-US"

// Person name, city, state: letters and spaces.
export const ALPHA_WITH_SPACES_OPTIONS = { ignore: " " }

// Center name, branch: letters, spaces and . ' -
export const ALPHA_WITH_PUNCTUATION_OPTIONS = { ignore: " .'-" }

export const PHONE_LOCALE = "en-IN"
// validator's blacklist puts these in a RegExp character class, so the dash must stay last.
export const PHONE_SEPARATORS = " ()-"

export const ISO_DATE_FORMAT = "YYYY-MM-DD"
export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export const MAX_ADDRESS_LENGTH = 300

export const VALIDATION_MESSAGES = {
  LOGIN_IDENTIFIER_REQUIRED: "Email is required.",
  LOGIN_IDENTIFIER_INVALID: "Enter a valid email address.",
  LETTERS_ONLY: "Only letters and spaces are allowed.",
  LETTERS_AND_PUNCTUATION_ONLY: "Only letters, spaces and . ' - are allowed.",
  NAME_REQUIRED: "Name is required.",
  EMAIL_REQUIRED: "Email is required.",
  EMAIL_INVALID: "Enter a valid email address.",
  PASSWORD_REQUIRED: "Password is required.",
  PASSWORD_TOO_WEAK: "Use at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.",
  CURRENT_PASSWORD_REQUIRED: "Current password is required.",
  NEW_PASSWORD_REQUIRED: "New password is required.",
  PHONE_REQUIRED: "Phone number is required.",
  MOBILE_NUMBER_INVALID: "Enter a valid 10-digit mobile number, e.g. +91 98765 43210.",
  ADDRESS_REQUIRED: "Address is required.",
  ADDRESS_TOO_LONG: `Address can be at most ${MAX_ADDRESS_LENGTH} characters.`,
  FEE_DUE_DAY_REQUIRED: "Fee due day is required.",
  FEE_DUE_DAY_INVALID: "Enter a day between 1 and 28.",
  CENTER_NAME_REQUIRED: "Center name is required.",
  CITY_REQUIRED: "City is required.",
  STATE_REQUIRED: "State is required.",
  FIRST_NAME_REQUIRED: "First name is required.",
  LAST_NAME_REQUIRED: "Last name is required.",
  PARENT_NAME_REQUIRED: "Parent name is required.",
  PARENT_PHONE_REQUIRED: "Parent WhatsApp number is required.",
  PHONE_INVALID: "Enter a valid 10-digit WhatsApp number, e.g. +91 98765 43210.",
  GRADE_REQUIRED: "Select a class.",
  SUBJECTS_REQUIRED: "Select at least one subject.",
  SUBJECT_INVALID: "Select subjects from the list.",
  MONTHLY_FEE_REQUIRED: "Monthly fee is required.",
  MONTHLY_FEE_INVALID: "Enter a whole amount between ₹1 and ₹1,00,000.",
  JOIN_DATE_REQUIRED: "Join date is required.",
  DATE_INVALID: "Enter a valid date.",
  DATE_RANGE_INVALID: "Start date can't be later than end date.",
  START_DATE_REQUIRED: "Start date is required.",
  END_DATE_REQUIRED: "End date is required.",
  END_DATE_IN_FUTURE: "End date can't be in the future.",
  START_DATE_TOO_EARLY: "Pick a start date within the last 2 years.",
  MONTH_INVALID: "Enter a valid month (YYYY-MM).",
  MONTH_IN_FUTURE: "Month can't be after the current month.",
  TOTAL_FEE_REQUIRED: "Total fee is required.",
  TOTAL_FEE_INVALID: "Enter a whole amount between ₹0 and ₹1,00,000.",
  DUE_DATE_REQUIRED: "Due date is required.",
  PAYMENT_AMOUNT_INVALID: "Enter a whole amount of at least ₹1.",
  PAYMENT_DATE_REQUIRED: "Payment date is required when you enter an amount.",
  PAYMENT_DATE_IN_FUTURE: "Payment date can't be in the future.",
  PAYMENT_METHOD_REQUIRED: "Payment method is required when you enter an amount.",
  REMINDER_CHANNEL_INVALID: "Only WhatsApp reminders can be recorded.",
  REMINDER_TYPE_INVALID: "Only manual reminders can be recorded.",
  CONTACT_REQUIRED: "Contact is required.",
  BATCH_NAME_REQUIRED: "Batch name is required.",
  BATCH_NAME_TOO_LONG: "Batch name can be at most 100 characters.",
  BATCH_DESCRIPTION_TOO_LONG: "Description can be at most 500 characters.",
  TIME_INVALID: "Enter a valid time.",
  BATCH_START_TIME_REQUIRED: "Enter a start time.",
  BATCH_END_TIME_REQUIRED: "Enter an end time.",
  BATCH_END_TIME_NOT_AFTER_START: "End time must be later than the start time.",
  STUDENT_IDS_INVALID: "Select students from the list.",
  PAYMENT_STATUS_INVALID: "Select a valid payment status.",
  PAGE_INVALID: "Page must be a whole number of at least 1.",
  LIMIT_INVALID: "Limit must be a whole number between 1 and 100.",
} as const
