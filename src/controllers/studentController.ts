import type { Request, Response } from "express"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import type { CreateStudentInput, StudentListQuery, UpdateStudentInput } from "../interfaces/student.js"
import { getAuthUser } from "../middleware/auth.js"
import * as feeService from "../services/feeService.js"
import * as studentService from "../services/studentService.js"

type StudentParams = { id: string }

export const listStudents = async (_request: Request, response: Response): Promise<void> => {
  const query: StudentListQuery = response.locals.query
  const { items, total } = await studentService.listStudents(query)
  response.status(HTTP_STATUS.OK).json({ students: items, total })
}

export const getStudent = async (request: Request<StudentParams>, response: Response): Promise<void> => {
  const student = await studentService.getStudent(request.params.id)
  response.status(HTTP_STATUS.OK).json({ student })
}

export const createStudent = async (request: Request, response: Response): Promise<void> => {
  const studentInput: CreateStudentInput = request.body
  const student = await studentService.createStudent(studentInput, getAuthUser(request)._id)
  response.status(HTTP_STATUS.CREATED).json({ student })
}

export const updateStudent = async (request: Request<StudentParams>, response: Response): Promise<void> => {
  const studentInput: UpdateStudentInput = request.body
  const student = await studentService.updateStudent(request.params.id, studentInput)
  response.status(HTTP_STATUS.OK).json({ student })
}

export const deleteStudent = async (request: Request<StudentParams>, response: Response): Promise<void> => {
  await studentService.deleteStudent(request.params.id)
  response.status(HTTP_STATUS.NO_CONTENT).end()
}

export const resetStudentPassword = async (request: Request<StudentParams>, response: Response): Promise<void> => {
  const temporaryPassword = await studentService.resetStudentPassword(request.params.id)
  response.status(HTTP_STATUS.OK).json({ temporaryPassword })
}

export const getPaymentHistory = async (request: Request<StudentParams>, response: Response): Promise<void> => {
  const paymentHistory = await feeService.getPaymentHistory(request.params.id)
  response.status(HTTP_STATUS.OK).json(paymentHistory)
}
