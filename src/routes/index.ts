import { Router } from "express"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import { authRoutes } from "./authRoutes.js"
import { batchRoutes } from "./batchRoutes.js"
import { dashboardRoutes } from "./dashboardRoutes.js"
import { feeRoutes } from "./feeRoutes.js"
import { studentRoutes } from "./studentRoutes.js"

// Everything under /api (REQUIREMENTS §7).
export const apiRoutes = Router()

apiRoutes.get("/health", (_request, response) => {
  response.status(HTTP_STATUS.OK).json({ status: "ok" })
})
apiRoutes.use("/auth", authRoutes)
apiRoutes.use("/students", studentRoutes)
apiRoutes.use("/fees", feeRoutes)
apiRoutes.use("/batches", batchRoutes)
apiRoutes.use("/dashboard", dashboardRoutes)
