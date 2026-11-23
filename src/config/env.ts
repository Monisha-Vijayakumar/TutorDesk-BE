import dotenv from "dotenv"
import { z } from "zod"

dotenv.config({ quiet: true })

const MIN_JWT_SECRET_LENGTH = 32

const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

// Variables the API needs to run. The seeder reads its own ADMIN_* variables (seeders/seedAdmin.ts).
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(MIN_JWT_SECRET_LENGTH),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "Use a number followed by s, m, h or d, e.g. 7d.")
    .default("7d"),
  CLIENT_URL: z.url(),
  APP_TIMEZONE: z.string().refine(isValidTimeZone, "Unknown time zone.").default("Asia/Kolkata"),
  STUDENT_CODE_START: z.coerce.number().int().positive().default(100000001),
})

const readEnv = (): z.infer<typeof envSchema> => {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n")
    console.error(`Invalid or missing environment variables:\n${problems}`)
    process.exit(1)
  }
  return result.data
}

export const env = readEnv()

export const isProduction = env.NODE_ENV === "production"
