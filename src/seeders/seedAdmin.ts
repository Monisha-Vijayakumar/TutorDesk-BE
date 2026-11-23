import { z } from "zod"
import { connectDatabase, disconnectDatabase } from "../config/db.js"
import { env } from "../config/env.js"
import { DEFAULT_FEE_DUE_DAY } from "../constants/fees.js"
import { USER_ROLES } from "../constants/userRoles.js"
import { VALIDATION_MESSAGES } from "../constants/validation.js"
import { User } from "../models/User.js"
import { hashPassword } from "../services/authService.js"
import { ensureStudentCodeCounter } from "../services/studentCodeService.js"
import { profileFields } from "../validators/authValidators.js"
import { strongPasswordField } from "../validators/fieldSchemas.js"

// The single admin's details from ADMIN_* env vars, checked with the same rules as Settings → Profile.
const adminEnvSchema = z.object({
  ADMIN_NAME: profileFields.name,
  ADMIN_EMAIL: z.email(VALIDATION_MESSAGES.EMAIL_INVALID).trim().toLowerCase(),
  ADMIN_PASSWORD: strongPasswordField(VALIDATION_MESSAGES.PASSWORD_REQUIRED),
  ADMIN_PHONE: profileFields.phone,
  ADMIN_ADDRESS: profileFields.address,
  ADMIN_CENTER_NAME: profileFields.centerName,
  ADMIN_CITY: profileFields.city,
  ADMIN_STATE: profileFields.state,
  ADMIN_BRANCH: profileFields.branch,
  FEE_DUE_DAY: z.coerce.number().pipe(profileFields.feeDueDay).default(DEFAULT_FEE_DUE_DAY),
})

const readAdminEnv = (): z.infer<typeof adminEnvSchema> => {
  const result = adminEnvSchema.safeParse(process.env)
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n")
    throw new Error(`Invalid or missing admin environment variables:\n${problems}`)
  }
  return result.data
}

// Idempotent (§13.8): creates the admin only when none exists, and the Student ID counter when missing.
const seedAdmin = async (): Promise<void> => {
  await ensureStudentCodeCounter(env.STUDENT_CODE_START)
  const existingAdmin = await User.exists({ role: USER_ROLES.ADMIN })
  if (existingAdmin) {
    console.log("Admin already exists — nothing to do.")
    return
  }
  const adminEnv = readAdminEnv()
  await User.create({
    name: adminEnv.ADMIN_NAME,
    role: USER_ROLES.ADMIN,
    email: adminEnv.ADMIN_EMAIL,
    passwordHash: await hashPassword(adminEnv.ADMIN_PASSWORD),
    phone: adminEnv.ADMIN_PHONE,
    address: adminEnv.ADMIN_ADDRESS,
    centerName: adminEnv.ADMIN_CENTER_NAME,
    branch: adminEnv.ADMIN_BRANCH,
    city: adminEnv.ADMIN_CITY,
    state: adminEnv.ADMIN_STATE,
    feeDueDay: adminEnv.FEE_DUE_DAY,
    // The seeded password must be replaced after the first login (FR-9g).
    mustChangePassword: true,
  })
  console.log(`Admin created: ${adminEnv.ADMIN_EMAIL}`)
}

const runSeeder = async (): Promise<void> => {
  await connectDatabase(env.MONGODB_URI)
  try {
    await User.syncIndexes()
    await seedAdmin()
  } finally {
    await disconnectDatabase()
  }
}

runSeeder().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
