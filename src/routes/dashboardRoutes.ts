import { Router } from "express"
import * as dashboardController from "../controllers/dashboardController.js"
import { USER_ROLES } from "../constants/userRoles.js"
import { requireAuth, requireRole } from "../middleware/auth.js"
import { validate } from "../middleware/validate.js"
import { feeCollectionQuerySchema } from "../validators/dashboardValidators.js"

export const dashboardRoutes = Router()

dashboardRoutes.use(requireAuth, requireRole(USER_ROLES.ADMIN))

dashboardRoutes.get("/stats", dashboardController.getDashboardStats)
dashboardRoutes.get(
  "/fee-collection",
  validate({ query: feeCollectionQuerySchema }),
  dashboardController.getFeeCollection
)
