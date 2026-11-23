import type { NextFunction, Request, Response } from "express"
import rateLimit from "express-rate-limit"
import { env } from "../config/env.js"
import { AUTH_COOKIE_NAME, LOGIN_RATE_LIMIT_MAX_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_MS } from "../constants/auth.js"
import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import type { AuthUser, UserRole } from "../interfaces/auth.js"
import { findActiveUser } from "../services/authService.js"
import { ApiError } from "../utils/ApiError.js"
import { readAuthToken } from "../utils/authToken.js"

// Cookie → verified JWT → current user on req.user. Any failure is a 401 (§13.4).
export const requireAuth = async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
  const tokenPayload = readAuthToken(request.cookies?.[AUTH_COOKIE_NAME])
  const user = tokenPayload ? await findActiveUser(tokenPayload.sub) : null
  if (!user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.SESSION_EXPIRED)
  }
  request.user = user
  next()
}

// The user set by requireAuth, for handlers on protected routes.
export const getAuthUser = (request: Request): AuthUser => {
  if (!request.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.SESSION_EXPIRED)
  }
  return request.user
}

export const requireRole =
  (role: UserRole) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    if (request.user?.role !== role) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN)
    }
    next()
  }

// Only failed logins count, so a tutor logging in normally is never locked out.
export const loginRateLimiter = rateLimit({
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  limit: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  skipSuccessfulRequests: true,
  skip: () => env.NODE_ENV === "test",
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: ERROR_MESSAGES.TOO_MANY_LOGIN_ATTEMPTS },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
})
