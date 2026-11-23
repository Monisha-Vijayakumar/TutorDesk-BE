import type { Request, Response } from "express"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import type { BatchInput, BatchListQuery } from "../interfaces/batch.js"
import { getAuthUser } from "../middleware/auth.js"
import * as batchService from "../services/batchService.js"

type BatchParams = { id: string }

export const listBatches = async (_request: Request, response: Response): Promise<void> => {
  const query: BatchListQuery = response.locals.query
  const { items, total } = await batchService.listBatches(query)
  response.status(HTTP_STATUS.OK).json({ batches: items, total })
}

export const getBatchTimeSlots = async (_request: Request, response: Response): Promise<void> => {
  const timeSlots = await batchService.getBatchTimeSlots()
  response.status(HTTP_STATUS.OK).json({ timeSlots })
}

export const getBatch = async (request: Request<BatchParams>, response: Response): Promise<void> => {
  const batch = await batchService.getBatch(request.params.id)
  response.status(HTTP_STATUS.OK).json({ batch })
}

export const createBatch = async (request: Request, response: Response): Promise<void> => {
  const batchInput: BatchInput = request.body
  const batch = await batchService.createBatch(batchInput, getAuthUser(request)._id)
  response.status(HTTP_STATUS.CREATED).json({ batch })
}

export const updateBatch = async (request: Request<BatchParams>, response: Response): Promise<void> => {
  const batchInput: BatchInput = request.body
  const batch = await batchService.updateBatch(request.params.id, batchInput)
  response.status(HTTP_STATUS.OK).json({ batch })
}

export const deleteBatch = async (request: Request<BatchParams>, response: Response): Promise<void> => {
  await batchService.deleteBatch(request.params.id)
  response.status(HTTP_STATUS.NO_CONTENT).end()
}
