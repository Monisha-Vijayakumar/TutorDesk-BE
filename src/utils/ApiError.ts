import type { FieldErrors } from "../interfaces/common.js"

// Thrown from services; errorHandler turns it into { message, errors? } with this status.
export class ApiError extends Error {
  readonly status: number
  readonly errors?: FieldErrors

  constructor(status: number, message: string, errors?: FieldErrors) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}
