import mongoose from "mongoose"
import { connectDatabase, disconnectDatabase } from "../config/db.js"
import { env, isProduction } from "../config/env.js"
import { PAYMENT_METHODS, PAISE_PER_RUPEE } from "../constants/fees.js"
import { GRADES, SUBJECTS } from "../constants/students.js"
import { USER_ROLES } from "../constants/userRoles.js"
import type { AuthUser } from "../interfaces/auth.js"
import type { PaymentMethod } from "../interfaces/fee.js"
import { Batch } from "../models/Batch.js"
import { FeeRecord } from "../models/FeeRecord.js"
import { Student } from "../models/Student.js"
import { User } from "../models/User.js"
import { updateFee } from "../services/feeService.js"
import { ensureFeeRecords } from "../services/feeRecordService.js"
import { createStudent } from "../services/studentService.js"
import { ensureStudentCodeCounter } from "../services/studentCodeService.js"
import { getCurrentMonth, getLastDayOfMonth, getNextMonth, getTodayIsoDate } from "../utils/dates.js"

// DEV ONLY (§13.8): a few demo students with mixed payments, so every page and endpoint has data to show.
// All demo students share this password (it passes the password policy).
const DEMO_STUDENT_PASSWORD = "Student@123"
const DEMO_STUDENT_COUNT = 12
const DEMO_HISTORY_MONTHS = 6
const FIRST_NAMES = ["Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Ishita", "Kabir", "Meera", "Rohan", "Saanvi"]
const LAST_NAMES = ["Sharma", "Iyer", "Patel", "Nair", "Reddy", "Gupta", "Menon"]
const PAYMENT_METHOD_LIST: PaymentMethod[] = Object.values(PAYMENT_METHODS)

const padTwoDigits = (value: number): string => String(value).padStart(2, "0")

const getMonthsAgo = (monthsBack: number): string => {
  const [year, monthNumber] = getCurrentMonth().split("-").map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 - monthsBack, 1))
  return date.toISOString().slice(0, 7)
}

const buildDemoStudent = (index: number): Parameters<typeof createStudent>[0] => {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
  const lastName = LAST_NAMES[index % LAST_NAMES.length]
  const joinMonth = getMonthsAgo(
    DEMO_HISTORY_MONTHS - 1 - Math.floor((index * DEMO_HISTORY_MONTHS) / DEMO_STUDENT_COUNT)
  )
  const joinDay = Math.min(((index * 5) % 25) + 1, Number(getTodayIsoDate().slice(8, 10)))
  const parentPhone = `+9191234${String(56780 + index).padStart(5, "0")}`
  return {
    firstName,
    lastName,
    email: index % 3 === 0 ? null : `${firstName}.${lastName}${index + 1}@example.com`.toLowerCase(),
    phone: index % 4 === 0 ? parentPhone : `+9198765${String(43210 + index).padStart(5, "0")}`,
    parentName: `${FIRST_NAMES[(index + 3) % FIRST_NAMES.length]} ${lastName}`,
    parentPhone,
    grade: GRADES[index % GRADES.length],
    subjects: [SUBJECTS[index % SUBJECTS.length], SUBJECTS[(index + 4) % SUBJECTS.length]],
    monthlyFee: (1500 + (index % 4) * 500) * PAISE_PER_RUPEE,
    joinDate: joinMonth === getCurrentMonth() ? getTodayIsoDate() : `${joinMonth}-${padTwoDigits(joinDay)}`,
    password: DEMO_STUDENT_PASSWORD,
  }
}

interface DemoMonthPlan {
  dueDate: string
  paymentShare: number // 0 = nothing paid, 0.5 = half, 1 = everything
}

// This month cycles through the four statuses: Paid, Pending (due at month end), Overdue (due date passed,
// when it has), Partially Paid. Past months are mostly paid, some half paid, some never paid.
const planDemoMonth = (dueDate: string, month: string, studentIndex: number, recordIndex: number): DemoMonthPlan => {
  const monthEnd = getLastDayOfMonth(month)
  if (month === getCurrentMonth()) {
    const currentMonthPlans: DemoMonthPlan[] = [
      { dueDate, paymentShare: 1 },
      { dueDate: monthEnd, paymentShare: 0 },
      { dueDate, paymentShare: 0 },
      { dueDate: monthEnd, paymentShare: 0.5 },
    ]
    return currentMonthPlans[studentIndex % currentMonthPlans.length]
  }
  const pastMonthShares = [0, 0.5, 1, 1, 1, 1, 1, 1, 1, 1]
  return { dueDate, paymentShare: pastMonthShares[(studentIndex * 7 + recordIndex * 3) % pastMonthShares.length] }
}

const recordDemoPayments = async (studentId: string, studentIndex: number, admin: AuthUser): Promise<void> => {
  const feeRecords = await FeeRecord.find({ studentId }).sort({ month: 1 }).lean()
  const today = getTodayIsoDate()
  for (const [recordIndex, feeRecord] of feeRecords.entries()) {
    const { dueDate, paymentShare } = planDemoMonth(feeRecord.dueDate, feeRecord.month, studentIndex, recordIndex)
    const amount = Math.round((feeRecord.totalFee * paymentShare) / PAISE_PER_RUPEE) * PAISE_PER_RUPEE
    const payment =
      amount > 0
        ? {
            amount,
            paidOn: feeRecord.dueDate < today ? feeRecord.dueDate : today,
            method: PAYMENT_METHOD_LIST[(studentIndex + recordIndex) % PAYMENT_METHOD_LIST.length],
          }
        : null
    await updateFee(feeRecord._id, { totalFee: feeRecord.totalFee, dueDate, payment }, admin)
  }
}

const seedDemoData = async (): Promise<void> => {
  const admin = await User.findOne({ role: USER_ROLES.ADMIN }).select("-passwordHash").lean<AuthUser>()
  if (!admin) {
    throw new Error("No admin found. Run `npm run seed` first.")
  }
  if (await Student.exists({})) {
    console.log("Students already exist — demo data not added.")
    return
  }
  await ensureStudentCodeCounter(env.STUDENT_CODE_START)
  const studentIds: string[] = []
  for (let index = 0; index < DEMO_STUDENT_COUNT; index += 1) {
    const student = await createStudent(buildDemoStudent(index), admin._id)
    studentIds.push(student.id)
  }
  for (let month = getMonthsAgo(DEMO_HISTORY_MONTHS - 1); month <= getCurrentMonth(); month = getNextMonth(month)) {
    await ensureFeeRecords(month)
  }
  for (const [index, studentId] of studentIds.entries()) {
    await recordDemoPayments(studentId, index, admin)
  }
  await Batch.create([
    {
      name: "Class 10 Maths – Morning",
      description: "Board exam batch",
      startTime: "07:00",
      endTime: "08:00",
      studentIds: studentIds.slice(0, 5),
      createdBy: admin._id,
    },
    {
      name: "Science – Evening",
      description: null,
      startTime: "17:00",
      endTime: "18:30",
      studentIds: studentIds.slice(4, 9),
      createdBy: admin._id,
    },
    {
      name: "Weekend Revision",
      description: null,
      startTime: null,
      endTime: null,
      studentIds: [],
      createdBy: admin._id,
    },
  ])
  console.log(
    `Demo data added: ${DEMO_STUDENT_COUNT} students (password ${DEMO_STUDENT_PASSWORD}), payments, 3 batches.`
  )
}

const runSeeder = async (): Promise<void> => {
  if (isProduction) {
    throw new Error("Demo data can't be added in production.")
  }
  await connectDatabase(env.MONGODB_URI)
  try {
    await mongoose.syncIndexes()
    await seedDemoData()
  } finally {
    await disconnectDatabase()
  }
}

runSeeder().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
