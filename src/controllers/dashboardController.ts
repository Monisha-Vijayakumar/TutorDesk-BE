import type { Request, Response } from "express"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import type { FeeCollectionQuery } from "../interfaces/dashboard.js"
import * as dashboardService from "../services/dashboardService.js"

export const getDashboardStats = async (_request: Request, response: Response): Promise<void> => {
  response.status(HTTP_STATUS.OK).json(await dashboardService.getDashboardStats())
}

export const getFeeCollection = async (_request: Request, response: Response): Promise<void> => {
  const query: FeeCollectionQuery = response.locals.query
  response.status(HTTP_STATUS.OK).json(await dashboardService.getFeeCollection(query))
}
