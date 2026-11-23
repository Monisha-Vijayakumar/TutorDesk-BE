import { randomUUID } from "node:crypto"
import type { PipelineStage } from "mongoose"
import type { PaginatedResult, PaginationQuery } from "../interfaces/common.js"

// Every collection uses a UUID string as _id (REQUIREMENTS §6).
export const uuidIdField = { type: String, default: (): string => randomUUID() }

// API objects use `id`; _id, __v and password hashes never leave the BE.
export const hideInternalFields = {
  toJSON: {
    virtuals: false,
    transform: (_document: unknown, returned: Record<string, unknown>): Record<string, unknown> => {
      const { _id, __v, passwordHash, ...visibleFields } = returned
      return { id: _id, ...visibleFields }
    },
  },
}

// User input becomes a literal, case-insensitive "contains" regex.
export const buildContainsRegex = (text: string): RegExp => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")

interface FacetResult<Item> {
  items: Item[]
  total: { count: number }[]
}

// Last stage of a list pipeline: one page of items plus the total across all pages.
// itemStages run on the page's items only (e.g. lookups only the visible rows need).
export const buildPaginationFacet = (
  { page, limit }: PaginationQuery,
  itemStages: PipelineStage.FacetPipelineStage[] = []
): PipelineStage.Facet => ({
  $facet: {
    items: [{ $skip: (page - 1) * limit }, { $limit: limit }, ...itemStages],
    total: [{ $count: "count" }],
  },
})

export const readPaginationFacet = <Item>(facetResults: FacetResult<Item>[]): PaginatedResult<Item> => {
  const [facetResult] = facetResults
  return { items: facetResult?.items ?? [], total: facetResult?.total[0]?.count ?? 0 }
}
