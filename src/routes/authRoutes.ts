import { Router } from "express"
import * as authController from "../controllers/authController.js"
import { USER_ROLES } from "../constants/userRoles.js"
import { loginRateLimiter, requireAuth, requireRole } from "../middleware/auth.js"
import { validate } from "../middleware/validate.js"
import { changePasswordSchema, loginSchema, updateProfileSchema } from "../validators/authValidators.js"

export const authRoutes = Router()

authRoutes.post("/login", loginRateLimiter, validate({ body: loginSchema }), authController.login)
authRoutes.post("/logout", authController.logout)
authRoutes.get("/me", requireAuth, authController.getCurrentUser)
authRoutes.patch(
  "/change-password",
  requireAuth,
  validate({ body: changePasswordSchema }),
  authController.changePassword
)
authRoutes.patch(
  "/profile",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate({ body: updateProfileSchema }),
  authController.updateProfile
)
