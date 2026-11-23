import { z } from "zod"
import { MAX_COLLECTION_RANGE_YEARS } from "../constants/dashboard.js"
import { VALIDATION_MESSAGES } from "../constants/validation.js"
import { getTodayIsoDate, subtractYears } from "../utils/dates.js"
import { isoDateField } from "./fieldSchemas.js"

export const feeCollectionQuerySchema = z
  .object({
    from: isoDateField(VALIDATION_MESSAGES.START_DATE_REQUIRED),
    to: isoDateField(VALIDATION_MESSAGES.END_DATE_REQUIRED).refine(
      (to) => to <= getTodayIsoDate(),
      VALIDATION_MESSAGES.END_DATE_IN_FUTURE
    ),
  })
  .superRefine(({ from, to }, context) => {
    if (from > to) {
      context.addIssue({ code: "custom", path: ["from"], message: VALIDATION_MESSAGES.DATE_RANGE_INVALID })
      return
    }
    if (from < subtractYears(getTodayIsoDate(), MAX_COLLECTION_RANGE_YEARS)) {
      context.addIssue({ code: "custom", path: ["from"], message: VALIDATION_MESSAGES.START_DATE_TOO_EARLY })
    }
  })
