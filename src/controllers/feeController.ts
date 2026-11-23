import type { Request, Response } from "express"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import type { CreateReminderInput, FeeListQuery, UpdateFeeInput } from "../interfaces/fee.js"
import { getAuthUser } from "../middleware/auth.js"
import * as feeService from "../services/feeService.js"
import * as reminderService from "../services/reminderService.js"

type FeeParams = { feeId: string }

export const listFees = async (_request: Request, response: Response): Promise<void> => {
  const query: FeeListQuery = response.locals.query
  const { items, total } = await feeService.listFees(query)
  response.status(HTTP_STATUS.OK).json({ fees: items, total })
}

export const updateFee = async (request: Request<FeeParams>, response: Response): Promise<void> => {
  const feeInput: UpdateFeeInput = request.body
  const fee = await feeService.updateFee(request.params.feeId, feeInput, getAuthUser(request))
  response.status(HTTP_STATUS.OK).json({ fee })
}

export const createReminder = async (request: Request<FeeParams>, response: Response): Promise<void> => {
  const reminderInput: CreateReminderInput = request.body
  const reminder = await reminderService.createReminder(request.params.feeId, reminderInput, getAuthUser(request)._id)
  response.status(HTTP_STATUS.CREATED).json({ reminder })
}
