import type { Request, Response } from "express"
import { AUTH_COOKIE_NAME } from "../constants/auth.js"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import type { ChangePasswordInput, LoginInput, UpdateProfileInput } from "../interfaces/auth.js"
import { getAuthUser } from "../middleware/auth.js"
import * as authService from "../services/authService.js"
import { authCookieOptions, authCookieOptionsWithExpiry } from "../utils/authToken.js"

export const login = async (request: Request, response: Response): Promise<void> => {
  const credentials: LoginInput = request.body
  const { user, token } = await authService.login(credentials)
  response.cookie(AUTH_COOKIE_NAME, token, authCookieOptionsWithExpiry)
  response.status(HTTP_STATUS.OK).json({ user })
}

export const logout = (_request: Request, response: Response): void => {
  response.clearCookie(AUTH_COOKIE_NAME, authCookieOptions)
  response.status(HTTP_STATUS.NO_CONTENT).end()
}

export const getCurrentUser = (request: Request, response: Response): void => {
  response.status(HTTP_STATUS.OK).json({ user: authService.toUserResponse(getAuthUser(request)) })
}

export const changePassword = async (request: Request, response: Response): Promise<void> => {
  const passwords: ChangePasswordInput = request.body
  await authService.changePassword(getAuthUser(request)._id, passwords)
  response.status(HTTP_STATUS.NO_CONTENT).end()
}

export const updateProfile = async (request: Request, response: Response): Promise<void> => {
  const profile: UpdateProfileInput = request.body
  const user = await authService.updateProfile(getAuthUser(request)._id, profile)
  response.status(HTTP_STATUS.OK).json({ user })
}
