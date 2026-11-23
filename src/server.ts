import mongoose from "mongoose"
import { createApp } from "./app.js"
import { connectDatabase } from "./config/db.js"
import { env } from "./config/env.js"
import { ensureStudentCodeCounter } from "./services/studentCodeService.js"

const startServer = async (): Promise<void> => {
  await connectDatabase(env.MONGODB_URI)
  if (env.NODE_ENV === "development") {
    await mongoose.syncIndexes()
  }
  await ensureStudentCodeCounter(env.STUDENT_CODE_START)
  createApp().listen(env.PORT, () => {
    console.log(`TutorDesk API listening on http://localhost:${env.PORT}/api`)
  })
}

startServer().catch((error: unknown) => {
  console.error("Failed to start the server:", error)
  process.exit(1)
})
