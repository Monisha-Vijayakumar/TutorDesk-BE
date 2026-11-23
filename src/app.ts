import cookieParser from "cookie-parser"
import cors from "cors"
import express, { type Express } from "express"
import helmet from "helmet"
import { env } from "./config/env.js"
import { JSON_BODY_LIMIT } from "./constants/auth.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { notFound } from "./middleware/notFound.js"
import { apiRoutes } from "./routes/index.js"

export const createApp = (): Express => {
  const app = express()

  // Render / Railway sit behind a proxy: needed for the client IP (login rate limit) and secure cookies.
  app.set("trust proxy", 1)
  app.use(helmet())
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    })
  )
  app.use(express.json({ limit: JSON_BODY_LIMIT }))
  app.use(cookieParser())

  app.use("/api", apiRoutes)
  app.use(notFound)
  app.use(errorHandler)

  return app
}
