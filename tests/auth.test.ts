import request from "supertest"
import { describe, expect, it } from "vitest"
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  app,
  buildStudentPayload,
  createAdmin,
  loginAsAdmin,
  STUDENT_PASSWORD,
} from "./helpers.js"

describe("health", () => {
  it("answers ok", async () => {
    const response = await request(app).get("/api/health").expect(200)
    expect(response.body).toEqual({ status: "ok" })
  })

  it("answers 404 with the error shape for unknown routes", async () => {
    const response = await request(app).get("/api/nope").expect(404)
    expect(response.body).toEqual({ message: "Not found." })
  })
})

describe("POST /api/auth/login", () => {
  it("logs the admin in with an httpOnly cookie and returns the user without secrets", async () => {
    await createAdmin()
    const response = await request(app)
      .post("/api/auth/login")
      .send({ identifier: ADMIN_EMAIL.toUpperCase(), password: ADMIN_PASSWORD })
      .expect(200)

    expect(response.body.user).toMatchObject({
      email: ADMIN_EMAIL,
      role: "ADMIN",
      centerName: "Bright Minds Tuition",
      feeDueDay: 10,
      mustChangePassword: true,
    })
    expect(response.body.user).not.toHaveProperty("passwordHash")
    expect(response.body).not.toHaveProperty("token")
    const cookie = response.headers["set-cookie"][0]
    expect(cookie).toMatch(/^tutordesk_token=/)
    expect(cookie).toMatch(/HttpOnly/i)
  })

  it("gives the same 401 message for a wrong password and an unknown user", async () => {
    await createAdmin()
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ identifier: ADMIN_EMAIL, password: "Wrong@1234" })
      .expect(401)
    const unknownUser = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "nobody@example.com", password: ADMIN_PASSWORD })
      .expect(401)

    expect(wrongPassword.body).toEqual({ message: "Invalid email or password." })
    expect(unknownUser.body).toEqual(wrongPassword.body)
  })

  it("returns 422 with field errors when fields are missing or invalid", async () => {
    const response = await request(app).post("/api/auth/login").send({ identifier: "not-an-id" }).expect(422)
    expect(response.body.errors).toEqual({
      identifier: "Enter a valid email address.",
      password: "Password is required.",
    })
  })

  it("returns 400 for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json")
      .expect(400)
    expect(response.body.message).toBeTypeOf("string")
  })
})

describe("session", () => {
  it("restores the session with /me and ends it with logout", async () => {
    const agent = await loginAsAdmin()
    const me = await agent.get("/api/auth/me").expect(200)
    expect(me.body.user.email).toBe(ADMIN_EMAIL)

    const logout = await agent.post("/api/auth/logout").expect(204)
    expect(logout.headers["set-cookie"][0]).toMatch(/tutordesk_token=;/)
    const afterLogout = await agent.get("/api/auth/me").expect(401)
    expect(afterLogout.body).toEqual({ message: "Your session has expired. Please log in again." })
  })

  it("rejects a tampered cookie", async () => {
    await request(app).get("/api/auth/me").set("Cookie", "tutordesk_token=abc.def.ghi").expect(401)
  })
})

describe("PATCH /api/auth/change-password", () => {
  it("checks the current password without logging the user out", async () => {
    const agent = await loginAsAdmin()
    const response = await agent
      .patch("/api/auth/change-password")
      .send({ currentPassword: "Wrong@1234", newPassword: "NewPass@123" })
      .expect(400)
    expect(response.body.errors).toEqual({ currentPassword: "Current password is incorrect." })
    await agent.get("/api/auth/me").expect(200)
  })

  it("rejects a weak or unchanged new password", async () => {
    const agent = await loginAsAdmin()
    const weak = await agent
      .patch("/api/auth/change-password")
      .send({ currentPassword: ADMIN_PASSWORD, newPassword: "weak" })
      .expect(422)
    expect(weak.body.errors.newPassword).toMatch(/at least 8 characters/)

    const same = await agent
      .patch("/api/auth/change-password")
      .send({ currentPassword: ADMIN_PASSWORD, newPassword: ADMIN_PASSWORD })
      .expect(400)
    expect(same.body.errors).toHaveProperty("newPassword")
  })

  it("changes the password and clears mustChangePassword", async () => {
    const agent = await loginAsAdmin()
    await agent
      .patch("/api/auth/change-password")
      .send({ currentPassword: ADMIN_PASSWORD, newPassword: "NewPass@123" })
      .expect(204)

    const me = await agent.get("/api/auth/me").expect(200)
    expect(me.body.user.mustChangePassword).toBe(false)
    await request(app).post("/api/auth/login").send({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(401)
    await request(app).post("/api/auth/login").send({ identifier: ADMIN_EMAIL, password: "NewPass@123" }).expect(200)
  })
})

describe("PATCH /api/auth/profile", () => {
  const profile = {
    name: "Priya Raman",
    phone: "98765-43210",
    address: "  45 Lake View Road  ",
    centerName: "St. Mary's Academy",
    branch: "",
    city: "Chennai",
    state: "Tamil Nadu",
    feeDueDay: 5,
  }

  it("saves the profile (sanitised) and returns the user", async () => {
    const agent = await loginAsAdmin()
    const response = await agent.patch("/api/auth/profile").send(profile).expect(200)
    expect(response.body.user).toMatchObject({
      name: "Priya Raman",
      phone: "9876543210",
      address: "45 Lake View Road",
      branch: null,
      feeDueDay: 5,
      email: ADMIN_EMAIL,
    })
  })

  it("refuses email, role and unknown fields", async () => {
    const agent = await loginAsAdmin()
    const response = await agent
      .patch("/api/auth/profile")
      .send({ ...profile, email: "new@example.com", role: "STUDENT" })
      .expect(422)
    expect(Object.keys(response.body.errors).sort()).toEqual(["email", "role"])
  })

  it("validates the fields like the FE", async () => {
    const agent = await loginAsAdmin()
    const response = await agent
      .patch("/api/auth/profile")
      .send({ ...profile, name: "Priya 2", feeDueDay: 30, phone: "12345" })
      .expect(422)
    expect(response.body.errors).toMatchObject({
      name: "Only letters and spaces are allowed.",
      feeDueDay: "Enter a day between 1 and 28.",
      phone: "Enter a valid 10-digit mobile number, e.g. +91 98765 43210.",
    })
  })
})

describe("student login", () => {
  it("logs a student in with the Student ID only, and blocks a deleted student", async () => {
    const admin = await loginAsAdmin()
    const created = await admin
      .post("/api/students")
      .send(buildStudentPayload({ email: "aarav@example.com" }))
      .expect(201)
    const { id, studentCode } = created.body.student

    const byEmail = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "aarav@example.com", password: STUDENT_PASSWORD })
    expect(byEmail.status).toBe(401)

    const student = request.agent(app)
    const login = await student
      .post("/api/auth/login")
      .send({ identifier: studentCode.toLowerCase(), password: STUDENT_PASSWORD })
      .expect(200)
    expect(login.body.user).toEqual({
      id: expect.any(String),
      name: "Aarav Sharma",
      role: "STUDENT",
      studentCode,
      mustChangePassword: true,
    })
    await student.get("/api/students").expect(403)
    await student.patch("/api/auth/profile").send({}).expect(403)

    await admin.delete(`/api/students/${id}`).expect(204)
    await student.get("/api/auth/me").expect(401)
    await request(app).post("/api/auth/login").send({ identifier: studentCode, password: STUDENT_PASSWORD }).expect(401)
  })
})
