import type { PipelineStage } from "mongoose"
import { ERROR_MESSAGES } from "../constants/errorMessages.js"
import { HTTP_STATUS } from "../constants/httpStatus.js"
import type {
  BatchInput,
  BatchListQuery,
  BatchRecord,
  BatchResponse,
  BatchStudentResponse,
  BatchSummaryResponse,
  BatchTimeSlot,
} from "../interfaces/batch.js"
import type { PaginatedResult } from "../interfaces/common.js"
import { Batch } from "../models/Batch.js"
import { Student } from "../models/Student.js"
import { ApiError } from "../utils/ApiError.js"
import { buildContainsRegex, buildPaginationFacet, readPaginationFacet } from "../utils/mongo.js"
import { buildStudentSearchMatch } from "./feeRecordService.js"

interface BatchStudentRecord {
  _id: string
  studentCode: string
  firstName: string
  lastName: string
}

interface BatchWithStudents extends BatchRecord {
  students: BatchStudentRecord[]
}

// The assigned students that are still current (deleted students are never counted or shown), by Student ID.
const currentStudentsLookup: PipelineStage.Lookup = {
  $lookup: {
    from: Student.collection.name,
    localField: "studentIds",
    foreignField: "_id",
    pipeline: [
      { $match: { deletedAt: null } },
      { $project: { studentCode: 1, firstName: 1, lastName: 1 } },
      { $sort: { studentCode: 1 } },
    ],
    as: "students",
  },
}

const toBatchSummaryResponse = (batch: BatchWithStudents): BatchSummaryResponse => ({
  id: batch._id,
  name: batch.name,
  description: batch.description,
  startTime: batch.startTime,
  endTime: batch.endTime,
  studentCount: batch.students.length,
  createdAt: batch.createdAt.toISOString(),
})

const toBatchStudentResponse = (student: BatchStudentRecord): BatchStudentResponse => ({
  id: student._id,
  studentCode: student.studentCode,
  firstName: student.firstName,
  lastName: student.lastName,
})

const toBatchResponse = (batch: BatchWithStudents): BatchResponse => ({
  ...toBatchSummaryResponse(batch),
  students: batch.students.map(toBatchStudentResponse),
})

// Batch name, or the Student ID / name of an assigned current student.
const buildBatchSearchMatch = async (search: string): Promise<Record<string, unknown>> => {
  const matchingStudentIds = await Student.distinct("_id", { deletedAt: null, ...buildStudentSearchMatch(search) })
  return { $or: [{ name: buildContainsRegex(search) }, { studentIds: { $in: matchingStudentIds } }] }
}

export const listBatches = async ({
  search,
  startTime,
  endTime,
  page,
  limit,
}: BatchListQuery): Promise<PaginatedResult<BatchSummaryResponse>> => {
  const searchMatch = search ? await buildBatchSearchMatch(search) : {}
  const timeMatch = startTime && endTime ? { startTime, endTime } : {}
  const facetResults = await Batch.aggregate([
    { $match: { ...searchMatch, ...timeMatch } },
    { $sort: { createdAt: -1, _id: -1 } },
    buildPaginationFacet({ page, limit }, [currentStudentsLookup]),
  ])
  const { items, total } = readPaginationFacet<BatchWithStudents>(facetResults)
  return { items: items.map(toBatchSummaryResponse), total }
}

// Distinct time slots in use, earliest first; batches without a time are left out.
export const getBatchTimeSlots = async (): Promise<BatchTimeSlot[]> =>
  Batch.aggregate<BatchTimeSlot>([
    { $match: { startTime: { $type: "string" }, endTime: { $type: "string" } } },
    { $group: { _id: { startTime: "$startTime", endTime: "$endTime" } } },
    { $sort: { "_id.startTime": 1, "_id.endTime": 1 } },
    { $project: { _id: 0, startTime: "$_id.startTime", endTime: "$_id.endTime" } },
  ])

export const getBatch = async (batchId: string): Promise<BatchResponse> => {
  const [batch] = await Batch.aggregate<BatchWithStudents>([{ $match: { _id: batchId } }, currentStudentsLookup])
  if (!batch) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.BATCH_NOT_FOUND)
  }
  return toBatchResponse(batch)
}

// Every selected student must be a current student (unknown or deleted → 400).
const assertStudentsAreCurrent = async (studentIds: string[]): Promise<void> => {
  if (studentIds.length === 0) {
    return
  }
  const currentStudentCount = await Student.countDocuments({ _id: { $in: studentIds }, deletedAt: null })
  if (currentStudentCount !== studentIds.length) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.BATCH_STUDENTS_NOT_FOUND)
  }
}

export const createBatch = async (batchInput: BatchInput, adminId: string): Promise<BatchResponse> => {
  await assertStudentsAreCurrent(batchInput.studentIds)
  const batch = await Batch.create({ ...batchInput, createdBy: adminId })
  return getBatch(batch._id)
}

// The body is the batch's full new state: null clears description / time, studentIds replaces the assignments.
export const updateBatch = async (batchId: string, batchInput: BatchInput): Promise<BatchResponse> => {
  const existingBatch = await Batch.exists({ _id: batchId })
  if (!existingBatch) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.BATCH_NOT_FOUND)
  }
  await assertStudentsAreCurrent(batchInput.studentIds)
  await Batch.updateOne({ _id: batchId }, batchInput)
  return getBatch(batchId)
}

// Hard delete: the batch and its assignments go; student records are never touched (FR-16d).
export const deleteBatch = async (batchId: string): Promise<void> => {
  const { deletedCount } = await Batch.deleteOne({ _id: batchId })
  if (deletedCount === 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.BATCH_NOT_FOUND)
  }
}
