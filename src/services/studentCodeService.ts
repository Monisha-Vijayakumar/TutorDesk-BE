import { STUDENT_CODE_COUNTER_ID, STUDENT_CODE_DIGIT_COUNT, STUDENT_CODE_PREFIX } from "../constants/students.js"
import { Counter } from "../models/Counter.js"

// Creates the counter at start − 1 when missing, so the first student gets `start`. Never lowers it.
export const ensureStudentCodeCounter = async (studentCodeStart: number): Promise<void> => {
  await Counter.updateOne(
    { _id: STUDENT_CODE_COUNTER_ID },
    { $setOnInsert: { value: studentCodeStart - 1 } },
    { upsert: true }
  )
}

// One atomic $inc, so concurrent requests never get the same Student ID; numbers are never reused (FR-9b).
export const takeNextStudentCode = async (): Promise<string> => {
  const counter = await Counter.findOneAndUpdate(
    { _id: STUDENT_CODE_COUNTER_ID },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  ).lean()
  return `${STUDENT_CODE_PREFIX}${String(counter.value).padStart(STUDENT_CODE_DIGIT_COUNT, "0")}`
}
