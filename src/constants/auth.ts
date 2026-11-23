export const AUTH_COOKIE_NAME = "tutordesk_token"

export const BCRYPT_SALT_ROUNDS = 12

// Failed logins allowed per IP in the window (successful logins don't count).
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10

export const JSON_BODY_LIMIT = "100kb"
