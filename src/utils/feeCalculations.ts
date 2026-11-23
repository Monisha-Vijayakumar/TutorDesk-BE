import { PAISE_PER_RUPEE } from "../constants/fees.js"
import { buildIsoDate, getDayOfMonth, getDaysInMonth, getMonthOfDate } from "./dates.js"

// Whole rupees, kept in paise.
export const roundToRupee = (amountInPaise: number): number =>
  Math.round(amountInPaise / PAISE_PER_RUPEE) * PAISE_PER_RUPEE

// Default Total Fee (FR-28): the monthly fee, pro-rated by the remaining days in the joining month.
export const calculateDefaultTotalFee = (monthlyFee: number, joinDate: string, month: string): number => {
  if (getMonthOfDate(joinDate) !== month) {
    return monthlyFee
  }
  const daysInMonth = getDaysInMonth(month)
  const remainingDays = daysInMonth - getDayOfMonth(joinDate) + 1
  return roundToRupee((monthlyFee * remainingDays) / daysInMonth)
}

// Default Due Date (FR-23, FR-27): the fee due day of the month, or the join date when the student joined later.
export const calculateDefaultDueDate = (feeDueDay: number, joinDate: string, month: string): string => {
  const dueDate = buildIsoDate(month, feeDueDay)
  return joinDate > dueDate ? joinDate : dueDate
}
