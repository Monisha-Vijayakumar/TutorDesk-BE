import { randomUUID } from "node:crypto"
import mongoose from "mongoose"
import { afterAll, afterEach, beforeAll, inject } from "vitest"
import { connectDatabase, disconnectDatabase } from "../src/config/db.js"
import { DEFAULT_STUDENT_CODE_START } from "../src/constants/students.js"
import { ensureStudentCodeCounter } from "../src/services/studentCodeService.js"

// Each test file gets its own database on the shared replica set (tests/globalSetup.ts).
beforeAll(async () => {
  const mongoUri = new URL(inject("mongoUri"))
  mongoUri.pathname = `/test-${randomUUID()}`
  await connectDatabase(mongoUri.toString())
  await mongoose.syncIndexes()
  await ensureStudentCodeCounter(DEFAULT_STUDENT_CODE_START)
})

afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections)
  await Promise.all(collections.map((collection) => collection.deleteMany({})))
  await ensureStudentCodeCounter(DEFAULT_STUDENT_CODE_START)
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await disconnectDatabase()
})
