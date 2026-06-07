/**
 * Offset (page-based) pagination helpers.
 */
export interface OffsetPaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function parseOffsetPagination(
  query: Record<string, unknown>,
  defaults: { limit?: number; maxLimit?: number } = {},
): OffsetPaginationParams {
  const maxLimit = defaults.maxLimit ?? 100;
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const rawLimit = Number.parseInt(String(query.limit ?? defaults.limit ?? 20), 10) || 20;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}

export interface OffsetPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  /** Index signature so this satisfies the response `meta` (Record<string, unknown>). */
  [key: string]: unknown;
}

export function buildOffsetMeta(
  total: number,
  params: OffsetPaginationParams,
): OffsetPageMeta {
  const totalPages = Math.ceil(total / params.limit);
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasMore: params.page < totalPages,
  };
}

/**
 * Cursor pagination helpers. The cursor is an opaque ISO timestamp (createdAt)
 * used for keyset pagination on recency-ordered lists (feeds, messages).
 */
export interface CursorPaginationParams {
  limit: number;
  cursor?: string;
}

export function parseCursorPagination(
  query: Record<string, unknown>,
  defaults: { limit?: number; maxLimit?: number } = {},
): CursorPaginationParams {
  const maxLimit = defaults.maxLimit ?? 50;
  const rawLimit = Number.parseInt(String(query.limit ?? defaults.limit ?? 20), 10) || 20;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  const cursor = query.cursor ? String(query.cursor) : undefined;
  return { limit, cursor };
}

/**
 * Given a page fetched with `take = limit + 1`, split off the extra row and
 * compute the next cursor from a caller-provided selector.
 */
export function buildCursorPage<T>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => string,
): { items: T[]; nextCursor: string | null; hasMore: boolean } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && items.length > 0 ? cursorOf(items[items.length - 1]) : null;
  return { items, nextCursor, hasMore };
}
