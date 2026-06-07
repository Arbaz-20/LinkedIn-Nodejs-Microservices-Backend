import { z } from 'zod';

const uuid = z.string().uuid();

export const idParams = z.object({ id: uuid });

/** Cursor pagination query for GET / (list notifications). */
export const listNotificationsQuery = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/** PUT /preferences — any subset of the boolean flags. */
export const updatePreferencesSchema = z
  .object({
    inApp: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    connections: z.boolean(),
    messages: z.boolean(),
    posts: z.boolean(),
    jobs: z.boolean(),
  })
  .partial();
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
