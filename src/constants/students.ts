// Same lists as the FE's GRADE_OPTIONS / SUBJECT_OPTIONS (REQUIREMENTS §13.6).
export const GRADES = Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`)

export const SUBJECTS = [
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Hindi",
  "Tamil",
  "Social Science",
  "Computer Science",
  "Accountancy",
  "Economics",
] as const

// Student ID (studentCode): "S" + 9 digits, e.g. S100000001.
export const STUDENT_CODE_PREFIX = "S"
export const STUDENT_CODE_DIGIT_COUNT = 9
export const STUDENT_CODE_PATTERN = /^S\d{9}$/
export const STUDENT_CODE_COUNTER_ID = "studentCode"
export const DEFAULT_STUDENT_CODE_START = 100000001
