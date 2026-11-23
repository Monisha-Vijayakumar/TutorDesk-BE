import type { z } from "zod"
import type { USER_ROLES } from "../constants/userRoles.js"
import type { changePasswordSchema, loginSchema, updateProfileSchema } from "../validators/authValidators.js"

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

// Stored User document (REQUIREMENTS §6). Admin-only and student-only fields are null for the other role.
export interface UserRecord {
  _id: string
  name: string
  role: UserRole
  email: string | null
  passwordHash: string
  phone: string | null
  address: string | null
  centerName: string | null
  branch: string | null
  city: string | null
  state: string | null
  feeDueDay: number | null
  studentId: string | null
  studentCode: string | null
  mustChangePassword: boolean
  createdAt: Date
  updatedAt: Date
}

// The logged-in user on req.user (never carries the password hash).
export type AuthUser = Omit<UserRecord, "passwordHash">

export interface AdminUserResponse {
  id: string
  name: string
  email: string
  role: typeof USER_ROLES.ADMIN
  phone: string
  address: string
  centerName: string
  branch: string | null
  city: string
  state: string
  feeDueDay: number
  mustChangePassword: boolean
}

export interface StudentUserResponse {
  id: string
  name: string
  role: typeof USER_ROLES.STUDENT
  studentCode: string
  mustChangePassword: boolean
}

export type UserResponse = AdminUserResponse | StudentUserResponse

export interface AuthTokenPayload {
  sub: string
  role: UserRole
}

export interface LoginResult {
  user: UserResponse
  token: string
}

export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
