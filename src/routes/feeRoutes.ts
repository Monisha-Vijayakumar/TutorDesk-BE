import { Router } from "express"
import * as feeController from "../controllers/feeController.js"
import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { USER_ROLES } from "../constants/userRoles.js"
import { requireAuth, requireRole } from "../middleware/auth.js"
import { requireUuidParam, validate } from "../middleware/validate.js"
import { createReminderSchema, feeListQuerySchema, updateFeeSchema } from "../validators/feeValidators.js"

// No add or delete here: students are managed on the Students endpoints (§4.5).
export const feeRoutes = Router()

feeRoutes.use(requireAuth, requireRole(USER_ROLES.ADMIN))
feeRoutes.param("feeId", requireUuidParam(ERROR_MESSAGES.FEE_NOT_FOUND))

feeRoutes.get("/", validate({ query: feeListQuerySchema }), feeController.listFees)
feeRoutes.patch("/:feeId", validate({ body: updateFeeSchema }), feeController.updateFee)
feeRoutes.post("/:feeId/reminders", validate({ body: createReminderSchema }), feeController.createReminder)
