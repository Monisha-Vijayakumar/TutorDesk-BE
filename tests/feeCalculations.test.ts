import { describe, expect, it } from "vitest"
import { calculateDefaultDueDate, calculateDefaultTotalFee, roundToRupee } from "../src/utils/feeCalculations.js"
import { listMonthsBetween, subtractYears } from "../src/utils/dates.js"

describe("fee calculations", () => {
  it("charges the full monthly fee outside the joining month", () => {
    expect(calculateDefaultTotalFee(250000, "2026-03-15", "2026-04")).toBe(250000)
  })

  it("pro-rates the joining month by the remaining days, rounded to whole rupees", () => {
    // Joined 16 Nov: 15 of 30 days.
    expect(calculateDefaultTotalFee(250000, "2026-11-16", "2026-11")).toBe(125000)
    // Joined 20 Feb 2026: 9 of 28 days → ₹803.57 → ₹804.
    expect(calculateDefaultTotalFee(250000, "2026-02-20", "2026-02")).toBe(80400)
    // Joined on the 1st: the whole fee.
    expect(calculateDefaultTotalFee(250000, "2026-11-01", "2026-11")).toBe(250000)
  })

  it("uses the fee due day, or the join date when the student joined after it", () => {
    expect(calculateDefaultDueDate(10, "2026-03-15", "2026-04")).toBe("2026-04-10")
    expect(calculateDefaultDueDate(10, "2026-11-05", "2026-11")).toBe("2026-11-10")
    expect(calculateDefaultDueDate(10, "2026-11-16", "2026-11")).toBe("2026-11-16")
  })

  it("rounds paise to whole rupees", () => {
    expect(roundToRupee(80357)).toBe(80400)
    expect(roundToRupee(80349)).toBe(80300)
  })
})

describe("date helpers", () => {
  it("lists every month touched by a range", () => {
    expect(listMonthsBetween("2025-11-20", "2026-02-03")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"])
  })

  it("subtracts years, turning 29 Feb into 28 Feb", () => {
    expect(subtractYears("2028-02-29", 2)).toBe("2026-02-28")
  })
})
