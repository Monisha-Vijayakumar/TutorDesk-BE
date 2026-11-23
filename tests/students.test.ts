import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { Student } from "../src/models/Student.js"
import { app, buildStudentPayload, loginAsAdmin, type TestAgent } from "./helpers.js"

describe("students API", () => {
  let admin: TestAgent

  beforeEach(async () => {
    admin = await loginAsAdmin()
  })

  it("requires login", async () => {
    await request(app).get("/api/students").expect(401)
  })

  it("creates a student with the next Student ID, the parent's phone as fallback and a Pending payment", async () => {
    const first = await admin.post("/api/students").send(buildStudentPayload()).expect(201)
    const second = await admin
      .post("/api/students")
      .send(buildStudentPayload({ firstName: "Diya", phone: "+91 98765-43211" }))
      .expect(201)

    expect(first.body.student).toMatchObject({
      studentCode: "S100000001",
      phone: "+919123456780",
      parentPhone: "+919123456780",
      email: null,
      currentPayment: { status: expect.any(String), paidOn: null, method: null },
    })
    expect(first.body.student).not.toHaveProperty("password")
    expect(second.body.student).toMatchObject({ studentCode: "S100000002", phone: "+919876543211" })
  })

  it("returns 422 with errors under the FE field names", async () => {
    const response = await admin
      .post("/api/students")
      .send(
        buildStudentPayload({
          firstName: "Aarav1",
          parentPhone: "123",
          subjects: [],
          monthlyFee: 150050,
          grade: "Class 13",
          password: "short",
        })
      )
      .expect(422)
    expect(response.body.errors).toEqual({
      firstName: "Only letters and spaces are allowed.",
      parentPhone: "Enter a valid 10-digit WhatsApp number, e.g. +91 98765 43210.",
      subjects: "Select at least one subject.",
      monthlyFee: "Enter a whole amount between ₹1 and ₹1,00,000.",
      grade: "Select a class.",
      password: "Use at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.",
    })
  })

  it("keeps emails unique among current students only and never reuses a Student ID", async () => {
    const created = await admin
      .post("/api/students")
      .send(buildStudentPayload({ email: "Aarav@Example.com" }))
      .expect(201)
    expect(created.body.student.email).toBe("aarav@example.com")

    const duplicate = await admin
      .post("/api/students")
      .send(buildStudentPayload({ email: "aarav@example.com" }))
      .expect(409)
    expect(duplicate.body).toEqual({ message: "A student with this email already exists." })

    await admin.delete(`/api/students/${created.body.student.id}`).expect(204)
    const reused = await admin
      .post("/api/students")
      .send(buildStudentPayload({ email: "aarav@example.com" }))
      .expect(201)
    expect(reused.body.student.studentCode).toBe("S100000002")
  })

  it("lists current students newest first, with search and pagination", async () => {
    const names = ["Aarav", "Diya", "Vihaan"]
    for (const firstName of names) {
      await admin.post("/api/students").send(buildStudentPayload({ firstName })).expect(201)
    }

    const firstPage = await admin.get("/api/students").query({ page: 1, limit: 2 }).expect(200)
    expect(firstPage.body.total).toBe(3)
    expect(firstPage.body.students.map((student: { firstName: string }) => student.firstName)).toEqual([
      "Vihaan",
      "Diya",
    ])

    const byName = await admin.get("/api/students").query({ search: "diya sh" }).expect(200)
    expect(byName.body.students).toHaveLength(1)
    const byCode = await admin.get("/api/students").query({ search: "000003" }).expect(200)
    expect(byCode.body.students[0].firstName).toBe("Vihaan")
    const regexText = await admin.get("/api/students").query({ search: ".*" }).expect(200)
    expect(regexText.body.total).toBe(0)
  })

  it("validates list query params", async () => {
    const fields = await admin
      .get("/api/students")
      .query({ limit: 500, paymentStatus: "LATE", paidTo: "05/01" })
      .expect(422)
    expect(Object.keys(fields.body.errors).sort()).toEqual(["limit", "paidTo", "paymentStatus"])

    const range = await admin.get("/api/students").query({ paidFrom: "2026-05-10", paidTo: "2026-05-01" }).expect(422)
    expect(range.body.errors).toEqual({ paidFrom: "Start date can't be later than end date." })
  })

  it("updates a student (and the phone fallback applies on edit)", async () => {
    const created = await admin
      .post("/api/students")
      .send(buildStudentPayload({ phone: "9876543212" }))
      .expect(201)
    const { password: _password, ...details } = buildStudentPayload({ lastName: "Iyer", phone: null })
    const response = await admin.patch(`/api/students/${created.body.student.id}`).send(details).expect(200)
    expect(response.body.student).toMatchObject({
      lastName: "Iyer",
      phone: "+919123456780",
      studentCode: "S100000001",
    })
  })

  it("soft deletes: the record stays, but the student is 404 everywhere and gone from lists", async () => {
    const created = await admin.post("/api/students").send(buildStudentPayload()).expect(201)
    const { id } = created.body.student

    await admin.delete(`/api/students/${id}`).expect(204)
    expect(await Student.exists({ _id: id })).toBeTruthy()
    await admin.get(`/api/students/${id}`).expect(404)
    await admin.delete(`/api/students/${id}`).expect(404)
    const { password: _password, ...details } = buildStudentPayload()
    await admin.patch(`/api/students/${id}`).send(details).expect(404)
    const list = await admin.get("/api/students").expect(200)
    expect(list.body.total).toBe(0)
  })

  it("treats a non-UUID id as not found", async () => {
    const response = await admin.get("/api/students/S100000001").expect(404)
    expect(response.body).toEqual({ message: "Student not found." })
  })

  it("resets a student's password to a temporary one", async () => {
    const created = await admin.post("/api/students").send(buildStudentPayload()).expect(201)
    const response = await admin.post(`/api/students/${created.body.student.id}/reset-password`).expect(200)
    expect(response.body.temporaryPassword).toMatch(/^[A-Za-z]{8}@\d{2}Td$/)
  })
})
