import type { NextFunction, Request, Response } from "express"
import { ZodError } from "zod"
import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import type { ApiErrorBody, FieldErrors } from "../interfaces/common.js"
import { ApiError } from "../utils/ApiError.js"

const MONGO_DUPLICATE_KEY_CODE = 11000

interface BodyParserError {
  type: string
  status: number
}

const isBodyParserError = (error: unknown): error is BodyParserError =>
  typeof error === "object" && error !== null && "type" in error && "status" in error

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === MONGO_DUPLICATE_KEY_CODE

// Top-level body/query keys stay as they are ("email"); array indexes are dropped ("subjects.2" → "subjects");
// nested objects keep their path ("payment.amount", toast-only on the FE).
const getFieldName = (path: PropertyKey[]): string =>
  path.filter((segment): segment is string => typeof segment === "string").join(".")

// The first message per field, like the FE's forms show it.
const getFieldErrors = (zodError: ZodError): FieldErrors => {
  const fieldErrors: FieldErrors = {}
  zodError.issues.forEach((issue) => {
    const fieldNames = issue.code === "unrecognized_keys" ? issue.keys : [getFieldName(issue.path)]
    const message = issue.code === "unrecognized_keys" ? ERROR_MESSAGES.FIELD_NOT_ALLOWED : issue.message
    fieldNames.forEach((fieldName) => {
      fieldErrors[fieldName] ??= message
    })
  })
  return fieldErrors
}

const sendError = (response: Response, status: number, body: ApiErrorBody): void => {
  response.status(status).json(body)
}

// One error shape for every failure: { message, errors? } (REQUIREMENTS §13.5). Never a stack trace.
export const errorHandler = (error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
  if (error instanceof ApiError) {
    sendError(response, error.status, { message: error.message, errors: error.errors })
    return
  }
  if (error instanceof ZodError) {
    sendError(response, HTTP_STATUS.UNPROCESSABLE_ENTITY, {
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      errors: getFieldErrors(error),
    })
    return
  }
  if (isBodyParserError(error) && error.type === "entity.parse.failed") {
    sendError(response, HTTP_STATUS.BAD_REQUEST, { message: ERROR_MESSAGES.INVALID_JSON })
    return
  }
  if (isBodyParserError(error) && error.type === "entity.too.large") {
    sendError(response, HTTP_STATUS.PAYLOAD_TOO_LARGE, { message: ERROR_MESSAGES.PAYLOAD_TOO_LARGE })
    return
  }
  if (isDuplicateKeyError(error)) {
    sendError(response, HTTP_STATUS.CONFLICT, { message: ERROR_MESSAGES.CONFLICT })
    return
  }
  console.error("Unexpected error:", error)
  sendError(response, HTTP_STATUS.INTERNAL_SERVER_ERROR, { message: ERROR_MESSAGES.SERVER_ERROR })
}
