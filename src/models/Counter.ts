import { model, Schema } from "mongoose"

interface CounterRecord {
  _id: string
  value: number
}

// Sequences taken atomically with $inc, e.g. _id "studentCode" for Student IDs. Never decremented.
const counterSchema = new Schema<CounterRecord>(
  {
    _id: { type: String, required: true },
    value: { type: Number, required: true },
  },
  { versionKey: false }
)

export const Counter = model<CounterRecord>("Counter", counterSchema)
