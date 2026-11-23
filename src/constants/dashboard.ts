export const FEE_COLLECTION_GRANULARITIES = {
  DAY: "DAY",
  MONTH: "MONTH",
} as const

// Fee collection: per day up to this many days, per month above it.
export const MAX_DAILY_COLLECTION_DAYS = 62
// The longest range GET /dashboard/fee-collection accepts.
export const MAX_COLLECTION_RANGE_YEARS = 2
