import type { AuthUser } from "../interfaces/auth.js"

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth.
      user?: AuthUser
    }
  }
}

export {}
