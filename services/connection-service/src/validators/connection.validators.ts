import { z } from 'zod';

const uuid = z.string().uuid();

export const sendRequestSchema = z.object({
  addresseeId: uuid,
  note: z.string().trim().max(300).nullable().optional(),
});
export type SendRequestInput = z.infer<typeof sendRequestSchema>;

export const idParams = z.object({ id: uuid });
export const userIdParams = z.object({ userId: uuid });

/** Optional status filter for GET / (list connections). */
export const listConnectionsQuery = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']).optional(),
});
