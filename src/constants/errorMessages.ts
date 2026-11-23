// Request-level messages sent as { message } (REQUIREMENTS §7, §13.5). Short and safe to show to users.
export const ERROR_MESSAGES = {
  VALIDATION_FAILED: "Please check the submitted information and try again.",
  INVALID_JSON: "The request body is not valid JSON.",
  PAYLOAD_TOO_LARGE: "The request body is too large.",
  ROUTE_NOT_FOUND: "Not found.",
  SERVER_ERROR: "Something went wrong on the server. Please try again later.",
  CONFLICT: "This operation conflicts with existing information.",

  INVALID_LOGIN: "Invalid email or password.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  FORBIDDEN: "You do not have permission to perform this action.",
  TOO_MANY_LOGIN_ATTEMPTS: "Too many login attempts. Please try again in 15 minutes.",
  CURRENT_PASSWORD_INCORRECT: "Current password is incorrect.",
  NEW_PASSWORD_SAME_AS_CURRENT: "New password must be different from the current password.",
  FIELD_NOT_ALLOWED: "This field can't be changed.",

  STUDENT_NOT_FOUND: "Student not found.",
  STUDENT_EMAIL_TAKEN: "A student with this email already exists.",

  FEE_NOT_FOUND: "Fee record not found.",
  TOTAL_FEE_BELOW_PAID: "Total fee can't be less than the amount already paid.",
  PAYMENT_ABOVE_OUTSTANDING: "Payment is more than the outstanding amount.",
  NOTHING_OUTSTANDING: "Nothing is outstanding for this month.",

  BATCH_NOT_FOUND: "Batch not found.",
  BATCH_STUDENTS_NOT_FOUND: "One or more selected students no longer exist.",
} as const
