import { Router } from "express"
import * as batchController from "../controllers/batchController.js"
import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { USER_ROLES } from "../constants/userRoles.js"
import { requireAuth, requireRole } from "../middleware/auth.js"
import { requireUuidParam, validate } from "../middleware/validate.js"
import { batchListQuerySchema, batchSchema } from "../validators/batchValidators.js"

export const batchRoutes = Router()

batchRoutes.use(requireAuth, requireRole(USER_ROLES.ADMIN))
batchRoutes.param("id", requireUuidParam(ERROR_MESSAGES.BATCH_NOT_FOUND))

batchRoutes.get("/", validate({ query: batchListQuerySchema }), batchController.listBatches)
// Before /:id so "time-slots" isn't read as a batch id.
batchRoutes.get("/time-slots", batchController.getBatchTimeSlots)
batchRoutes.post("/", validate({ body: batchSchema }), batchController.createBatch)
batchRoutes.get("/:id", batchController.getBatch)
batchRoutes.patch("/:id", validate({ body: batchSchema }), batchController.updateBatch)
batchRoutes.delete("/:id", batchController.deleteBatch)
