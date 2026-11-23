import request from "supertest"
import { createApp } from "../src/app.js"
import { USER_ROLES } from "../src/constants/userRoles.js"
import { User } from "../src/models/User.js"
import { hashPassword } from "../src/services/authService.js"
import { getCurrentMonth } from "../src/utils/dates.js"

export const app = createApp()

export type TestAgent = ReturnType<typeof request.agent>

export const ADMIN_EMAIL = "admin@tutordesk.test"
export const ADMIN_PASSWORD = "Admin@1234"
export const STUDENT_PASSWORD = "Student@123"

export const createAdmin = async (): Promise<void> => {
  await User.create({
    name: "Test Admin",
    role: USER_ROLES.ADMIN,
    email: ADMIN_EMAIL,
    passwordHash: await hashPassword(ADMIN_PASSWORD),
    phone: "+919876543210",
    address: "12 Test Street",
    centerName: "Bright Minds Tuition",
    branch: null,
    city: "Chennai",
    state: "Tamil Nadu",
    feeDueDay: 10,
    mustChangePassword: true,
  })
}

// A supertest agent keeps the auth cookie between requests, like the browser does.
export const loginAsAdmin = async (): Promise<TestAgent> => {
  await createAdmin()
  const agent = request.agent(app)
  await agent.post("/api/auth/login").send({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(200)
  return agent
}

// A month earlier than the current one, "YYYY-MM".
export const getPastMonth = (monthsBack: number): string => {
  const [year, monthNumber] = getCurrentMonth().split("-").map(Number)
  return new Date(Date.UTC(year, monthNumber - 1 - monthsBack, 1)).toISOString().slice(0, 7)
}

export const buildStudentPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  firstName: "Aarav",
  lastName: "Sharma",
  email: null,
  phone: "",
  parentName: "Ravi Sharma",
  parentPhone: "+91 91234 56780",
  grade: "Class 10",
  subjects: ["Mathematics", "Science"],
  monthlyFee: 250000,
  joinDate: `${getPastMonth(2)}-01`,
  password: STUDENT_PASSWORD,
  ...overrides,
})
