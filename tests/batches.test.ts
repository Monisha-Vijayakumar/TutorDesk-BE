import { beforeEach, describe, expect, it } from "vitest"
import { Student } from "../src/models/Student.js"
import { buildStudentPayload, loginAsAdmin, type TestAgent } from "./helpers.js"

describe("batches API", () => {
  let admin: TestAgent
  let studentIds: string[]

  beforeEach(async () => {
    admin = await loginAsAdmin()
    studentIds = []
    for (const firstName of ["Aarav", "Diya", "Kabir"]) {
      const created = await admin.post("/api/students").send(buildStudentPayload({ firstName })).expect(201)
      studentIds.push(created.body.student.id)
    }
  })

  const createBatch = async (body: Record<string, unknown>): Promise<{ id: string }> => {
    const response = await admin.post("/api/batches").send(body).expect(201)
    return response.body.batch
  }

  it("creates a batch with only a name, cleaning empty optional fields", async () => {
    const response = await admin
      .post("/api/batches")
      .send({ name: "  Weekend Revision  ", description: "   ", startTime: null, endTime: null, studentIds: [] })
      .expect(201)
    expect(response.body.batch).toEqual({
      id: expect.any(String),
      name: "Weekend Revision",
      description: null,
      startTime: null,
      endTime: null,
      studentCount: 0,
      createdAt: expect.any(String),
      students: [],
    })
  })

  it("validates the time range and the students", async () => {
    const times = await admin
      .post("/api/batches")
      .send({ name: "Morning", description: null, startTime: "09:00", endTime: null, studentIds: [] })
      .expect(422)
    expect(times.body.errors).toEqual({ endTime: "Enter an end time." })

    const order = await admin
      .post("/api/batches")
      .send({ name: "Morning", description: null, startTime: "10:00", endTime: "09:00", studentIds: [] })
      .expect(422)
    expect(order.body.errors).toEqual({ endTime: "End time must be later than the start time." })

    const unknownStudent = await admin
      .post("/api/batches")
      .send({ name: "Morning", description: null, startTime: null, endTime: null, studentIds: ["not-a-student"] })
      .expect(400)
    expect(unknownStudent.body).toEqual({ message: "One or more selected students no longer exist." })
  })

  it("lists, searches by batch name or student, and filters by time slot", async () => {
    await createBatch({
      name: "Maths Morning",
      description: null,
      startTime: "07:00",
      endTime: "08:00",
      studentIds: [studentIds[0], studentIds[0]],
    })
    await createBatch({
      name: "Science Evening",
      description: null,
      startTime: "17:00",
      endTime: "18:00",
      studentIds: [studentIds[1]],
    })

    const all = await admin.get("/api/batches").expect(200)
    expect(all.body.total).toBe(2)
    expect(all.body.batches[0]).toMatchObject({ name: "Science Evening", studentCount: 1 })
    expect(all.body.batches[1]).toMatchObject({ name: "Maths Morning", studentCount: 1 })

    const byName = await admin.get("/api/batches").query({ search: "morn" }).expect(200)
    expect(byName.body.batches.map((batch: { name: string }) => batch.name)).toEqual(["Maths Morning"])
    const byStudent = await admin.get("/api/batches").query({ search: "diya" }).expect(200)
    expect(byStudent.body.batches.map((batch: { name: string }) => batch.name)).toEqual(["Science Evening"])
    const byCode = await admin.get("/api/batches").query({ search: "S100000001" }).expect(200)
    expect(byCode.body.total).toBe(1)

    const bySlot = await admin.get("/api/batches").query({ startTime: "17:00", endTime: "18:00" }).expect(200)
    expect(bySlot.body.total).toBe(1)
    await admin.get("/api/batches").query({ startTime: "17:00" }).expect(422)

    const slots = await admin.get("/api/batches/time-slots").expect(200)
    expect(slots.body.timeSlots).toEqual([
      { startTime: "07:00", endTime: "08:00" },
      { startTime: "17:00", endTime: "18:00" },
    ])
  })

  it("updates with the full new state and shows assigned students by Student ID", async () => {
    const batch = await createBatch({
      name: "Maths",
      description: "Old",
      startTime: "07:00",
      endTime: "08:00",
      studentIds: [studentIds[0]],
    })
    const response = await admin
      .patch(`/api/batches/${batch.id}`)
      .send({
        name: "Maths",
        description: null,
        startTime: null,
        endTime: null,
        studentIds: [studentIds[2], studentIds[1]],
      })
      .expect(200)
    expect(response.body.batch).toMatchObject({ description: null, startTime: null, endTime: null, studentCount: 2 })
    expect(response.body.batch.students.map((student: { studentCode: string }) => student.studentCode)).toEqual([
      "S100000002",
      "S100000003",
    ])
  })

  it("drops a deleted student from batches and hard-deletes a batch without touching students", async () => {
    const batch = await createBatch({ name: "Maths", description: null, startTime: null, endTime: null, studentIds })
    await admin.delete(`/api/students/${studentIds[0]}`).expect(204)

    const view = await admin.get(`/api/batches/${batch.id}`).expect(200)
    expect(view.body.batch.studentCount).toBe(2)

    await admin.delete(`/api/batches/${batch.id}`).expect(204)
    await admin.get(`/api/batches/${batch.id}`).expect(404)
    await admin.delete(`/api/batches/${batch.id}`).expect(404)
    expect(await Student.countDocuments({ deletedAt: null })).toBe(2)
  })
})
