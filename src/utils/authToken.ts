import type { CookieOptions } from "express"
import jwt from "jsonwebtoken"
import { env, isProduction } from "../config/env.js"
import { USER_ROLES } from "../constants/userRoles.js"
import type { AuthTokenPayload, UserRole } from "../interfaces/auth.js"

const MS_PER_UNIT: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }

// JWT_EXPIRES_IN ("7d", "12h", …) in milliseconds, so the cookie lives exactly as long as the token.
const getTokenLifetimeMs = (): number => {
  const amount = Number.parseInt(env.JWT_EXPIRES_IN, 10)
  const unit = env.JWT_EXPIRES_IN.slice(-1)
  return amount * MS_PER_UNIT[unit]
}

// Production: FE (Vercel) and BE (Render) are different sites → SameSite=None + Secure (§13.4).
export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  path: "/",
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
}

export const authCookieOptionsWithExpiry: CookieOptions = { ...authCookieOptions, maxAge: getTokenLifetimeMs() }

export const signAuthToken = (userId: string, role: UserRole): string =>
  jwt.sign({ role }, env.JWT_SECRET, { subject: userId, expiresIn: getTokenLifetimeMs() / 1000 })

const isUserRole = (value: unknown): value is UserRole => Object.values(USER_ROLES).some((role) => role === value)

// Null for a missing, expired, tampered or malformed token.
export const readAuthToken = (token: unknown): AuthTokenPayload | null => {
  if (typeof token !== "string" || !token) {
    return null
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET)
    if (typeof payload === "string" || !payload.sub || !isUserRole(payload.role)) {
      return null
    }
    return { sub: payload.sub, role: payload.role }
  } catch {
    return null
  }
}
