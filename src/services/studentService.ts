import { randomInt, randomUUID } from "node:crypto"
import { runInTransaction } from "../config/db.js"
import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { PAYMENT_STATUSES } from "../constants/fees.js"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import { USER_ROLES } from "../constants/userRoles.js"
import type { PaginatedResult } from "../interfaces/common.js"
import type {
  CreateStudentInput,
  StudentFeeRow,
  StudentListQuery,
  StudentResponse,
  UpdateStudentInput,
} from "../interfaces/student.js"
import { Batch } from "../models/Batch.js"
import { Student } from "../models/Student.js"
import { User } from "../models/User.js"
import { ApiError } from "../utils/ApiError.js"
import { getCurrentMonth } from "../utils/dates.js"
import { hashPassword } from "./authService.js"
import { ensureFeeRecords, findStudentFeeRow, listStudentFeeRows } from "./feeRecordService.js"
import { takeNextStudentCode } from "./studentCodeService.js"

// The Student object of the API (§7). currentPayment is read-only, from this month's fee record (FR-11a).
const toStudentResponse = ({ fee, ...student }: StudentFeeRow): StudentResponse => ({
  id: student._id,
  studentCode: student.studentCode,
  firstName: student.firstName,
  lastName: student.lastName,
  email: student.email,
  phone: student.phone,
  parentName: student.parentName,
  parentPhone: student.parentPhone,
  grade: student.grade,
  subjects: student.subjects,
  monthlyFee: student.monthlyFee,
  joinDate: student.joinDate,
  createdAt: student.createdAt.toISOString(),
  currentPayment: {
    status: fee?.status ?? PAYMENT_STATUSES.PENDING,
    paidOn: fee?.lastPaymentDate ?? null,
    method: fee?.lastPaymentMethod ?? null,
  },
})

const getFullName = (firstName: string, lastName: string): string => `${firstName} ${lastName}`

// Emails only have to be unique among current students (FR-11).
const assertEmailIsFree = async (email: string | null, excludedStudentId?: string): Promise<void> => {
  if (!email) {
    return
  }
  const studentWithEmail = await Student.exists({ email, deletedAt: null, _id: { $ne: excludedStudentId } })
  if (studentWithEmail) {
    throw new ApiError(HTTP_STATUS.CONFLICT, ERROR_MESSAGES.STUDENT_EMAIL_TAKEN)
  }
}

const assertStudentIsCurrent = async (studentId: string): Promise<void> => {
  const currentStudent = await Student.exists({ _id: studentId, deletedAt: null })
  if (!currentStudent) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.STUDENT_NOT_FOUND)
  }
}

export const listStudents = async ({
  page,
  limit,
  ...filters
}: StudentListQuery): Promise<PaginatedResult<StudentResponse>> => {
  const month = getCurrentMonth()
  await ensureFeeRecords(month)
  const { items, total } = await listStudentFeeRows({ month, filters }, { page, limit })
  return { items: items.map(toStudentResponse), total }
}

export const getStudent = async (studentId: string): Promise<StudentResponse> => {
  const month = getCurrentMonth()
  await ensureFeeRecords(month, [studentId])
  const row = await findStudentFeeRow(studentId, month)
  if (!row) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.STUDENT_NOT_FOUND)
  }
  return toStudentResponse(row)
}

// Creates the Student, its STUDENT login (hashed password, must change it) and the next Student ID (FR-9a–c).
export const createStudent = async (
  { password, ...details }: CreateStudentInput,
  adminId: string
): Promise<StudentResponse> => {
  await assertEmailIsFree(details.email)
  const studentId = randomUUID()
  const studentCode = await takeNextStudentCode()
  const passwordHash = await hashPassword(password)
  await runInTransaction(async (session) => {
    await Student.create([{ ...details, _id: studentId, studentCode, createdBy: adminId }], { session })
    await User.create(
      [
        {
          name: getFullName(details.firstName, details.lastName),
          role: USER_ROLES.STUDENT,
          passwordHash,
          studentId,
          studentCode,
          mustChangePassword: true,
        },
      ],
      { session }
    )
  })
  return getStudent(studentId)
}

// Existing fee records keep their amounts; only months created afterwards use the new monthly fee / join date.
export const updateStudent = async (studentId: string, details: UpdateStudentInput): Promise<StudentResponse> => {
  await assertStudentIsCurrent(studentId)
  await assertEmailIsFree(details.email, studentId)
  await runInTransaction(async (session) => {
    await Student.updateOne({ _id: studentId }, details, { session })
    await User.updateOne({ studentId }, { name: getFullName(details.firstName, details.lastName) }, { session })
  })
  return getStudent(studentId)
}

// Soft delete (FR-13): the student disappears everywhere, can't log in, and leaves every batch.
// Payments and reminder logs stay.
export const deleteStudent = async (studentId: string): Promise<void> => {
  await runInTransaction(async (session) => {
    const { matchedCount } = await Student.updateOne(
      { _id: studentId, deletedAt: null },
      { deletedAt: new Date() },
      { session }
    )
    if (matchedCount === 0) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.STUDENT_NOT_FOUND)
    }
    await Batch.updateMany({ studentIds: studentId }, { $pull: { studentIds: studentId } }, { session })
  })
}

const TEMPORARY_PASSWORD_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
const TEMPORARY_PASSWORD_LENGTH = 8

// Always passes the password policy: random letters, then a symbol, a digit, an upper- and a lower-case letter.
const generateTemporaryPassword = (): string => {
  const randomLetters = Array.from(
    { length: TEMPORARY_PASSWORD_LENGTH },
    () => TEMPORARY_PASSWORD_LETTERS[randomInt(TEMPORARY_PASSWORD_LETTERS.length)]
  ).join("")
  return `${randomLetters}@${randomInt(10, 100)}Td`
}

// FR-9e: a new temporary password, returned once; the student must change it at the next login.
export const resetStudentPassword = async (studentId: string): Promise<string> => {
  await assertStudentIsCurrent(studentId)
  const temporaryPassword = generateTemporaryPassword()
  await User.updateOne({ studentId }, { passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true })
  return temporaryPassword
}
