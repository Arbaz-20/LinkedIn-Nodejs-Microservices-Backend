import { z } from 'zod';

/** Shared query shape for the paginated search endpoints. */
export const searchQuery = z.object({
  q: z.string().trim().min(1, 'q is required'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchQuery = z.infer<typeof searchQuery>;

/** Autocomplete only needs a query and an optional cap on suggestions. */
export const autocompleteQuery = z.object({
  q: z.string().trim().min(1, 'q is required'),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});
export type AutocompleteQuery = z.infer<typeof autocompleteQuery>;
