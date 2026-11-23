import { beforeEach, describe, expect, it } from "vitest"
import { FeeRecord } from "../src/models/FeeRecord.js"
import { getCurrentMonth, getLastDayOfMonth, getTodayIsoDate } from "../src/utils/dates.js"
import { buildStudentPayload, getPastMonth, loginAsAdmin, type TestAgent } from "./helpers.js"

interface FeeRow {
  id: string
  month: string
  totalFee: number
  paidAmount: number
  outstandingAmount: number
  status: string
  dueDate: string
}

describe("fees API", () => {
  let admin: TestAgent
  let studentId: string
  const pastMonth = getPastMonth(1)

  // A fee record from last month (its due date has passed) to drive the status rules.
  const getPastFee = async (): Promise<FeeRow> => {
    const response = await admin.get("/api/fees").query({ month: pastMonth }).expect(200)
    return response.body.fees[0]
  }

  beforeEach(async () => {
    admin = await loginAsAdmin()
    const created = await admin.post("/api/students").send(buildStudentPayload()).expect(201)
    studentId = created.body.student.id
  })

  it("creates the month's fee records on demand with the monthly fee and the due day", async () => {
    const response = await admin.get("/api/fees").query({ month: pastMonth }).expect(200)
    expect(response.body.total).toBe(1)
    expect(response.body.fees[0]).toMatchObject({
      month: pastMonth,
      student: { id: studentId, studentCode: "S100000001", parentName: "Ravi Sharma", parentPhone: "+919123456780" },
      totalFee: 250000,
      paidAmount: 0,
      outstandingAmount: 250000,
      status: "OVERDUE",
      dueDate: `${pastMonth}-10`,
      lastPaymentDate: null,
      lastPaymentMethod: null,
    })
    await admin.get("/api/fees").query({ month: pastMonth }).expect(200)
    expect(await FeeRecord.countDocuments({ month: pastMonth })).toBe(1)
  })

  it("lists only students who had joined by the end of the month", async () => {
    const response = await admin
      .get("/api/fees")
      .query({ month: getPastMonth(3) })
      .expect(200)
    expect(response.body.total).toBe(0)
  })

  it("rejects a missing or future month", async () => {
    await admin.get("/api/fees").expect(422)
    const response = await admin.get("/api/fees").query({ month: "2999-01" }).expect(422)
    expect(response.body.errors.month).toBe("Month can't be after the current month.")
  })

  it("moves through Pending → Partially Paid → Paid, and Overdue once the due date has passed", async () => {
    const fee = await getPastFee()
    const futureDueDate = getLastDayOfMonth(getCurrentMonth())
    const update = (body: Record<string, unknown>): Promise<{ body: { fee: FeeRow } }> =>
      admin.patch(`/api/fees/${fee.id}`).send(body).expect(200)

    expect((await update({ totalFee: 250000, dueDate: futureDueDate, payment: null })).body.fee.status).toBe("PENDING")

    const partial = await update({
      totalFee: 250000,
      dueDate: futureDueDate,
      payment: { amount: 100000, paidOn: getTodayIsoDate(), method: "UPI" },
    })
    expect(partial.body.fee).toMatchObject({ status: "PARTIAL", paidAmount: 100000, outstandingAmount: 150000 })

    const overdue = await update({ totalFee: 250000, dueDate: `${pastMonth}-10`, payment: null })
    expect(overdue.body.fee.status).toBe("OVERDUE")

    const paid = await update({
      totalFee: 250000,
      dueDate: `${pastMonth}-10`,
      payment: { amount: 150000, paidOn: getTodayIsoDate(), method: "CASH" },
    })
    expect(paid.body.fee).toMatchObject({
      status: "PAID",
      paidAmount: 250000,
      outstandingAmount: 0,
      lastPaymentDate: getTodayIsoDate(),
      lastPaymentMethod: "CASH",
    })
  })

  it("enforces the business rules with 400s", async () => {
    const fee = await getPastFee()
    await admin
      .patch(`/api/fees/${fee.id}`)
      .send({
        totalFee: 250000,
        dueDate: fee.dueDate,
        payment: { amount: 200000, paidOn: getTodayIsoDate(), method: "UPI" },
      })
      .expect(200)

    const belowPaid = await admin
      .patch(`/api/fees/${fee.id}`)
      .send({ totalFee: 100000, dueDate: fee.dueDate, payment: null })
      .expect(400)
    expect(belowPaid.body).toEqual({ message: "Total fee can't be less than the amount already paid." })

    const tooMuch = await admin
      .patch(`/api/fees/${fee.id}`)
      .send({
        totalFee: 250000,
        dueDate: fee.dueDate,
        payment: { amount: 60000, paidOn: getTodayIsoDate(), method: "UPI" },
      })
      .expect(400)
    expect(tooMuch.body).toEqual({ message: "Payment is more than the outstanding amount." })
  })

  it("validates the edit body", async () => {
    const fee = await getPastFee()
    const response = await admin
      .patch(`/api/fees/${fee.id}`)
      .send({ totalFee: 1050, dueDate: "2026-02-30", payment: { amount: 0, paidOn: "2999-01-01", method: "CHEQUE" } })
      .expect(422)
    expect(response.body.errors).toEqual({
      totalFee: "Enter a whole amount between ₹0 and ₹1,00,000.",
      dueDate: "Enter a valid date.",
      "payment.amount": "Enter a whole amount of at least ₹1.",
      "payment.paidOn": "Payment date can't be in the future.",
      "payment.method": "Payment method is required when you enter an amount.",
    })
  })

  it("shows payments on the Students page and filters by status and payment date", async () => {
    const currentMonth = getCurrentMonth()
    const feeList = await admin.get("/api/fees").query({ month: currentMonth }).expect(200)
    const fee: FeeRow = feeList.body.fees[0]
    await admin
      .patch(`/api/fees/${fee.id}`)
      .send({
        totalFee: fee.totalFee,
        dueDate: fee.dueDate,
        payment: { amount: fee.totalFee, paidOn: getTodayIsoDate(), method: "UPI" },
      })
      .expect(200)

    const students = await admin.get("/api/students").query({ paymentStatus: "PAID" }).expect(200)
    expect(students.body.students[0].currentPayment).toEqual({
      status: "PAID",
      paidOn: getTodayIsoDate(),
      method: "UPI",
    })
    const notPending = await admin.get("/api/students").query({ paymentStatus: "PENDING" }).expect(200)
    expect(notPending.body.total).toBe(0)
    const byDate = await admin.get("/api/students").query({ paidFrom: getTodayIsoDate() }).expect(200)
    expect(byDate.body.total).toBe(1)
    const beforeDate = await admin.get("/api/fees").query({ month: currentMonth, paidTo: "2000-01-01" }).expect(200)
    expect(beforeDate.body.total).toBe(0)
  })

  it("returns payment history and records reminders as INITIATED until nothing is outstanding", async () => {
    const fee = await getPastFee()
    const reminder = await admin
      .post(`/api/fees/${fee.id}/reminders`)
      .send({ channel: "WHATSAPP", type: "MANUAL", contact: "+919123456780" })
      .expect(201)
    expect(reminder.body.reminder).toMatchObject({
      channel: "WHATSAPP",
      type: "MANUAL",
      status: "INITIATED",
      month: pastMonth,
    })

    await admin
      .patch(`/api/fees/${fee.id}`)
      .send({
        totalFee: fee.totalFee,
        dueDate: fee.dueDate,
        payment: { amount: fee.totalFee, paidOn: getTodayIsoDate(), method: "CARD" },
      })
      .expect(200)
    const nothingOutstanding = await admin
      .post(`/api/fees/${fee.id}/reminders`)
      .send({ channel: "WHATSAPP", type: "MANUAL", contact: "+919123456780" })
      .expect(409)
    expect(nothingOutstanding.body).toEqual({ message: "Nothing is outstanding for this month." })

    const history = await admin.get(`/api/students/${studentId}/payment-history`).expect(200)
    expect(history.body.payments).toEqual([
      {
        id: expect.any(String),
        month: pastMonth,
        amount: fee.totalFee,
        paidOn: getTodayIsoDate(),
        method: "CARD",
        recordedAt: expect.any(String),
        recordedBy: "Test Admin",
      },
    ])
    expect(history.body.reminders).toHaveLength(1)
  })

  it("only accepts manual WhatsApp reminders", async () => {
    const fee = await getPastFee()
    const response = await admin
      .post(`/api/fees/${fee.id}/reminders`)
      .send({ channel: "EMAIL", type: "DUE", contact: "" })
      .expect(422)
    expect(Object.keys(response.body.errors).sort()).toEqual(["channel", "contact", "type"])
  })

  it("answers 404 for fees and history of a deleted student", async () => {
    const fee = await getPastFee()
    await admin.delete(`/api/students/${studentId}`).expect(204)
    await admin.patch(`/api/fees/${fee.id}`).send({ totalFee: 1000, dueDate: fee.dueDate, payment: null }).expect(404)
    await admin
      .post(`/api/fees/${fee.id}/reminders`)
      .send({ channel: "WHATSAPP", type: "MANUAL", contact: "1" })
      .expect(404)
    await admin.get(`/api/students/${studentId}/payment-history`).expect(404)
    const list = await admin.get("/api/fees").query({ month: pastMonth }).expect(200)
    expect(list.body.total).toBe(0)
  })
})
