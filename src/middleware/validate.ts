import type { NextFunction, Request, RequestHandler, Response } from "express"
import validator from "validator"
import type { ZodType } from "zod"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import { ApiError } from "../utils/ApiError.js"

interface RequestSchemas {
  body?: ZodType
  query?: ZodType
}

// Sanitises + validates the request (a ZodError becomes a 422 in errorHandler).
// The parsed body replaces req.body; the parsed query goes to res.locals.query (req.query is read-only in Express 5).
export const validate =
  ({ body, query }: RequestSchemas): RequestHandler =>
  (request: Request, response: Response, next: NextFunction): void => {
    if (body) {
      request.body = body.parse(request.body ?? {})
    }
    if (query) {
      response.locals.query = query.parse(request.query)
    }
    next()
  }

// Ids in URLs are UUIDs; anything else can't exist → 404 (§13.5).
export const requireUuidParam =
  (notFoundMessage: string) =>
  (_request: Request, _response: Response, next: NextFunction, id: string): void => {
    next(validator.isUUID(id) ? undefined : new ApiError(HTTP_STATUS.NOT_FOUND, notFoundMessage))
  }
