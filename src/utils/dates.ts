import { env } from "../config/env.js"

// Date-only values are "YYYY-MM-DD" strings and months "YYYY-MM" (REQUIREMENTS §6).
// "Today" is the date in APP_TIMEZONE, never the server's clock.

const MS_PER_DAY = 24 * 60 * 60 * 1000

const padTwoDigits = (value: number): string => String(value).padStart(2, "0")

// en-CA formats dates as YYYY-MM-DD.
const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: env.APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export const getTodayIsoDate = (): string => todayFormatter.format(new Date())

export const getCurrentMonth = (): string => getTodayIsoDate().slice(0, 7)

export const getMonthOfDate = (isoDate: string): string => isoDate.slice(0, 7)

export const getDayOfMonth = (isoDate: string): number => Number(isoDate.slice(8, 10))

export const getDaysInMonth = (month: string): number => {
  const [year, monthNumber] = month.split("-").map(Number)
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
}

export const getLastDayOfMonth = (month: string): string => `${month}-${padTwoDigits(getDaysInMonth(month))}`

export const buildIsoDate = (month: string, day: number): string => `${month}-${padTwoDigits(day)}`

const toUtcTime = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`)

const fromUtcTime = (time: number): string => new Date(time).toISOString().slice(0, 10)

// Whole days from one date to another (same day = 0).
export const getDaysBetween = (fromDate: string, toDate: string): number =>
  Math.round((toUtcTime(toDate) - toUtcTime(fromDate)) / MS_PER_DAY)

export const getNextMonth = (month: string): string => {
  const [year, monthNumber] = month.split("-").map(Number)
  return monthNumber === 12 ? `${year + 1}-01` : `${year}-${padTwoDigits(monthNumber + 1)}`
}

// Every date from fromDate to toDate, both included.
export const listDatesBetween = (fromDate: string, toDate: string): string[] => {
  const dates: string[] = []
  for (let time = toUtcTime(fromDate); time <= toUtcTime(toDate); time += MS_PER_DAY) {
    dates.push(fromUtcTime(time))
  }
  return dates
}

// Every month touched by the range, both ends included.
export const listMonthsBetween = (fromDate: string, toDate: string): string[] => {
  const months: string[] = []
  const lastMonth = getMonthOfDate(toDate)
  for (let month = getMonthOfDate(fromDate); month <= lastMonth; month = getNextMonth(month)) {
    months.push(month)
  }
  return months
}

// The same calendar date some years earlier (29 Feb becomes 28 Feb).
export const subtractYears = (isoDate: string, years: number): string => {
  const year = Number(isoDate.slice(0, 4)) - years
  const month = isoDate.slice(5, 7)
  const day = Math.min(getDayOfMonth(isoDate), getDaysInMonth(`${year}-${month}`))
  return `${year}-${month}-${padTwoDigits(day)}`
}
