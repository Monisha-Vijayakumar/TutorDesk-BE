import validator from "validator"
import { z } from "zod"
import { MAX_BATCH_DESCRIPTION_LENGTH, MAX_BATCH_NAME_LENGTH } from "../constants/batches.js"
import { VALIDATION_MESSAGES } from "../constants/validation.js"
import { optionalSearchParam, optionalTextField, paginationParams, requiredText } from "./fieldSchemas.js"

// "HH:mm", 24-hour.
const isTime = (value: string): boolean => validator.isTime(value, { hourFormat: "hour24", mode: "default" })

const timeParam = z
  .string({ error: VALIDATION_MESSAGES.TIME_INVALID })
  .trim()
  .refine(isTime, VALIDATION_MESSAGES.TIME_INVALID)

const optionalTimeField = z
  .string({ error: VALIDATION_MESSAGES.TIME_INVALID })
  .trim()
  .nullish()
  .transform((value) => value || null)
  .refine((value) => value === null || isTime(value), VALIDATION_MESSAGES.TIME_INVALID)

interface TimeRange {
  startTime?: string | null
  endTime?: string | null
}

// Both times or neither.
const addMissingTimeIssues = ({ startTime, endTime }: TimeRange, context: z.RefinementCtx): void => {
  if (startTime && !endTime) {
    context.addIssue({ code: "custom", path: ["endTime"], message: VALIDATION_MESSAGES.BATCH_END_TIME_REQUIRED })
  }
  if (endTime && !startTime) {
    context.addIssue({ code: "custom", path: ["startTime"], message: VALIDATION_MESSAGES.BATCH_START_TIME_REQUIRED })
  }
}

// "HH:mm" strings compare in time order.
const addTimeRangeIssues = (timeRange: TimeRange, context: z.RefinementCtx): void => {
  addMissingTimeIssues(timeRange, context)
  const { startTime, endTime } = timeRange
  if (startTime && endTime && endTime <= startTime) {
    context.addIssue({ code: "custom", path: ["endTime"], message: VALIDATION_MESSAGES.BATCH_END_TIME_NOT_AFTER_START })
  }
}

export const batchListQuerySchema = z
  .object({
    search: optionalSearchParam,
    startTime: timeParam.optional(),
    endTime: timeParam.optional(),
    ...paginationParams,
  })
  .superRefine(addMissingTimeIssues)

// POST and PATCH send the full batch: null clears description / time, studentIds replaces the assignments.
export const batchSchema = z
  .object({
    name: requiredText(VALIDATION_MESSAGES.BATCH_NAME_REQUIRED).max(
      MAX_BATCH_NAME_LENGTH,
      VALIDATION_MESSAGES.BATCH_NAME_TOO_LONG
    ),
    description: optionalTextField().refine(
      (description) => description === null || description.length <= MAX_BATCH_DESCRIPTION_LENGTH,
      VALIDATION_MESSAGES.BATCH_DESCRIPTION_TOO_LONG
    ),
    startTime: optionalTimeField,
    endTime: optionalTimeField,
    studentIds: z
      .array(z.string({ error: VALIDATION_MESSAGES.STUDENT_IDS_INVALID }).trim(), {
        error: VALIDATION_MESSAGES.STUDENT_IDS_INVALID,
      })
      .default([])
      .transform((studentIds) => [...new Set(studentIds)]),
  })
  .superRefine(addTimeRangeIssues)
