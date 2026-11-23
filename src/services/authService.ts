import bcrypt from "bcryptjs"
import { BCRYPT_SALT_ROUNDS } from "../constants/auth.js"
import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { DEFAULT_FEE_DUE_DAY } from "../constants/fees.js"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import { USER_ROLES } from "../constants/userRoles.js"
import type {
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  LoginResult,
  UpdateProfileInput,
  UserResponse,
} from "../interfaces/auth.js"
import { Student } from "../models/Student.js"
import { User } from "../models/User.js"
import { ApiError } from "../utils/ApiError.js"
import { signAuthToken } from "../utils/authToken.js"

const HIDE_PASSWORD_HASH = "-passwordHash"

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, BCRYPT_SALT_ROUNDS)

// Compared against when the login identifier matches nobody, so both cases take the same time.
let unknownUserHash: Promise<string> | null = null
const getUnknownUserHash = (): Promise<string> => {
  unknownUserHash ??= hashPassword("unknown-user-placeholder")
  return unknownUserHash
}

// The user shape the FE expects from login, /me and profile updates (REQUIREMENTS §7).
export const toUserResponse = (user: AuthUser): UserResponse => {
  if (user.role === USER_ROLES.STUDENT) {
    return {
      id: user._id,
      name: user.name,
      role: USER_ROLES.STUDENT,
      studentCode: user.studentCode ?? "",
      mustChangePassword: user.mustChangePassword,
    }
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email ?? "",
    role: USER_ROLES.ADMIN,
    phone: user.phone ?? "",
    address: user.address ?? "",
    centerName: user.centerName ?? "",
    branch: user.branch,
    city: user.city ?? "",
    state: user.state ?? "",
    feeDueDay: user.feeDueDay ?? DEFAULT_FEE_DUE_DAY,
    mustChangePassword: user.mustChangePassword,
  }
}

const isStudentDeleted = async (studentId: string | null): Promise<boolean> => {
  const currentStudent = await Student.exists({ _id: studentId, deletedAt: null })
  return !currentStudent
}

// The logged-in user, or null when the account is gone or belongs to a deleted student (FR-13).
export const findActiveUser = async (userId: string): Promise<AuthUser | null> => {
  const user = await User.findById(userId).select(HIDE_PASSWORD_HASH).lean<AuthUser>()
  if (!user) {
    return null
  }
  if (user.role === USER_ROLES.STUDENT && (await isStudentDeleted(user.studentId))) {
    return null
  }
  return user
}

// Email → the admin only; Student ID → students only (FR-2). One message for every failure (§13.4).
export const login = async ({ identifier, password }: LoginInput): Promise<LoginResult> => {
  const isEmailLogin = identifier.includes("@")
  const user = await User.findOne(
    isEmailLogin ? { role: USER_ROLES.ADMIN, email: identifier } : { role: USER_ROLES.STUDENT, studentCode: identifier }
  ).lean()
  const isPasswordCorrect = await bcrypt.compare(password, user?.passwordHash ?? (await getUnknownUserHash()))
  if (!user || !isPasswordCorrect) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.INVALID_LOGIN)
  }
  if (user.role === USER_ROLES.STUDENT && (await isStudentDeleted(user.studentId))) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.INVALID_LOGIN)
  }
  const { passwordHash: _passwordHash, ...userWithoutHash } = user
  return { user: toUserResponse(userWithoutHash), token: signAuthToken(user._id, user.role) }
}

export const changePassword = async (
  userId: string,
  { currentPassword, newPassword }: ChangePasswordInput
): Promise<void> => {
  const user = await User.findById(userId).select("passwordHash").lean()
  if (!user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.SESSION_EXPIRED)
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    const message = ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, message, { currentPassword: message })
  }
  if (newPassword === currentPassword) {
    const message = ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_CURRENT
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, message, { newPassword: message })
  }
  await User.updateOne({ _id: userId }, { passwordHash: await hashPassword(newPassword), mustChangePassword: false })
}

export const updateProfile = async (userId: string, profile: UpdateProfileInput): Promise<UserResponse> => {
  const user = await User.findByIdAndUpdate(userId, profile, { new: true }).select(HIDE_PASSWORD_HASH).lean<AuthUser>()
  if (!user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.SESSION_EXPIRED)
  }
  return toUserResponse(user)
}

// The admin's fee due day, used for fee months created from now on (FR-27).
export const getAdminFeeDueDay = async (): Promise<number> => {
  const admin = await User.findOne({ role: USER_ROLES.ADMIN }).select("feeDueDay").lean()
  return admin?.feeDueDay ?? DEFAULT_FEE_DUE_DAY
}
