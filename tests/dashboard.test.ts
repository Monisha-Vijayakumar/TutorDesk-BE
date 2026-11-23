import { beforeEach, describe, expect, it } from "vitest"
import { getCurrentMonth, getTodayIsoDate, subtractYears } from "../src/utils/dates.js"
import { buildStudentPayload, loginAsAdmin, type TestAgent } from "./helpers.js"

describe("dashboard API", () => {
  let admin: TestAgent

  beforeEach(async () => {
    admin = await loginAsAdmin()
  })

  it("shows zeros and every status for a new center", async () => {
    const response = await admin.get("/api/dashboard/stats").expect(200)
    expect(response.body).toEqual({
      month: getCurrentMonth(),
      summary: {
        totalStudents: 0,
        totalBatches: 0,
        billedAmount: 0,
        collectedAmount: 0,
        outstandingAmount: 0,
        overdueCount: 0,
      },
      paymentStatusCounts: [
        { status: "PAID", count: 0, amount: 0 },
        { status: "PARTIAL", count: 0, amount: 0 },
        { status: "PENDING", count: 0, amount: 0 },
        { status: "OVERDUE", count: 0, amount: 0 },
      ],
      batchStudentCounts: [],
    })
  })

  it("totals this month's fees and money received", async () => {
    for (const firstName of ["Aarav", "Diya"]) {
      await admin.post("/api/students").send(buildStudentPayload({ firstName })).expect(201)
    }
    const fees = await admin.get("/api/fees").query({ month: getCurrentMonth() }).expect(200)
    const [fee] = fees.body.fees
    await admin
      .patch(`/api/fees/${fee.id}`)
      .send({
        totalFee: fee.totalFee,
        dueDate: fee.dueDate,
        payment: { amount: fee.totalFee, paidOn: getTodayIsoDate(), method: "UPI" },
      })
      .expect(200)
    await admin
      .post("/api/batches")
      .send({ name: "Maths", description: null, startTime: null, endTime: null, studentIds: [fee.student.id] })
      .expect(201)

    const stats = await admin.get("/api/dashboard/stats").expect(200)
    expect(stats.body.summary).toMatchObject({
      totalStudents: 2,
      totalBatches: 1,
      billedAmount: 500000,
      collectedAmount: 250000,
      outstandingAmount: 250000,
    })
    const paid = stats.body.paymentStatusCounts.find((count: { status: string }) => count.status === "PAID")
    expect(paid).toEqual({ status: "PAID", count: 1, amount: 250000 })
    expect(stats.body.batchStudentCounts).toEqual([{ batchId: expect.any(String), name: "Maths", studentCount: 1 }])

    const today = getTodayIsoDate()
    const collection = await admin
      .get("/api/dashboard/fee-collection")
      .query({ from: `${getCurrentMonth()}-01`, to: today })
      .expect(200)
    expect(collection.body).toMatchObject({ granularity: "DAY", collectedAmount: 250000 })
    expect(collection.body.points.at(-1)).toEqual({ period: today, collectedAmount: 250000 })

    const twoYears = await admin
      .get("/api/dashboard/fee-collection")
      .query({ from: subtractYears(today, 2), to: today })
      .expect(200)
    expect(twoYears.body.granularity).toBe("MONTH")
    expect(twoYears.body.points).toHaveLength(25)
    expect(twoYears.body.collectedAmount).toBe(250000)
  })

  it("rejects invalid fee collection ranges", async () => {
    const today = getTodayIsoDate()
    const reversed = await admin
      .get("/api/dashboard/fee-collection")
      .query({ from: today, to: "2020-01-01" })
      .expect(422)
    expect(reversed.body.errors.from).toBe("Start date can't be later than end date.")
    const future = await admin.get("/api/dashboard/fee-collection").query({ from: today, to: "2999-01-01" }).expect(422)
    expect(future.body.errors.to).toBe("End date can't be in the future.")
    const tooEarly = await admin
      .get("/api/dashboard/fee-collection")
      .query({ from: "2000-01-01", to: today })
      .expect(422)
    expect(tooEarly.body.errors.from).toBe("Pick a start date within the last 2 years.")
  })
})
