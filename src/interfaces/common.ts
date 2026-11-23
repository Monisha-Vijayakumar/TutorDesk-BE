// Field name → message, sent as `errors` with 422 (and some 400) responses.
export type FieldErrors = Record<string, string>

// The one error body every failed request gets (REQUIREMENTS §7, §13.5).
export interface ApiErrorBody {
  message: string
  errors?: FieldErrors
}

export interface PaginationQuery {
  page: number
  limit: number
}

export interface PaginatedResult<Item> {
  items: Item[]
  total: number
}
