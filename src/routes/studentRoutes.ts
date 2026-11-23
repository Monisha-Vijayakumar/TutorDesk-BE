import { Router } from "express"
import * as studentController from "../controllers/studentController.js"
import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { USER_ROLES } from "../constants/userRoles.js"
import { requireAuth, requireRole } from "../middleware/auth.js"
import { requireUuidParam, validate } from "../middleware/validate.js"
import { createStudentSchema, studentListQuerySchema, updateStudentSchema } from "../validators/studentValidators.js"

export const studentRoutes = Router()

studentRoutes.use(requireAuth, requireRole(USER_ROLES.ADMIN))
studentRoutes.param("id", requireUuidParam(ERROR_MESSAGES.STUDENT_NOT_FOUND))

studentRoutes.get("/", validate({ query: studentListQuerySchema }), studentController.listStudents)
studentRoutes.post("/", validate({ body: createStudentSchema }), studentController.createStudent)
studentRoutes.get("/:id", studentController.getStudent)
studentRoutes.patch("/:id", validate({ body: updateStudentSchema }), studentController.updateStudent)
studentRoutes.delete("/:id", studentController.deleteStudent)
studentRoutes.post("/:id/reset-password", studentController.resetStudentPassword)
studentRoutes.get("/:id/payment-history", studentController.getPaymentHistory)
