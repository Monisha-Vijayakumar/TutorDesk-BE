import type { Request, Response } from "express"
import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { HTTP_STATUS } from "../constants/httpStatus.js"

export const notFound = (_request: Request, response: Response): void => {
  response.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.ROUTE_NOT_FOUND })
}
