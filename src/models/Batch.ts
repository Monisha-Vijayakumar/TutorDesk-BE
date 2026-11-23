import { model, Schema } from "mongoose"
import { MAX_BATCH_DESCRIPTION_LENGTH, MAX_BATCH_NAME_LENGTH } from "../constants/batches.js"
import type { BatchRecord } from "../interfaces/batch.js"
import { hideInternalFields, uuidIdField } from "../utils/mongo.js"

// A group of students (§4.3). Hard-deleted; deleting never touches the students.
const batchSchema = new Schema<BatchRecord>(
  {
    _id: uuidIdField,
    name: { type: String, required: true, trim: true, maxlength: MAX_BATCH_NAME_LENGTH },
    description: { type: String, default: null, maxlength: MAX_BATCH_DESCRIPTION_LENGTH },
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    studentIds: { type: [{ type: String, ref: "Student" }], default: [] },
    createdBy: { type: String, ref: "User", required: true },
  },
  { timestamps: true, ...hideInternalFields }
)

batchSchema.index({ createdAt: -1 })
batchSchema.index({ startTime: 1, endTime: 1 })
batchSchema.index({ studentIds: 1 })

export const Batch = model<BatchRecord>("Batch", batchSchema)
