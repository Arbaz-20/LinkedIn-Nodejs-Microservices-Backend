import { z } from 'zod';

const uuid = z.string().uuid();

const postType = z.enum(['POST', 'ARTICLE', 'POLL', 'SHARE', 'CELEBRATION']);
const visibility = z.enum(['PUBLIC', 'CONNECTIONS', 'PRIVATE']);
const reactionType = z.enum(['LIKE', 'CELEBRATE', 'SUPPORT', 'LOVE', 'INSIGHTFUL', 'FUNNY']);

// ─── Posts ─────────────────────────────────────────────────
export const createPostSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  mediaUrls: z.array(z.string().url().max(512)).max(10).optional(),
  postType: postType.optional(),
  visibility: visibility.optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  mediaUrls: z.array(z.string().url().max(512)).max(10).optional(),
  visibility: visibility.optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const idParams = z.object({ id: uuid });
export const commentIdParams = z.object({ commentId: uuid });
export const hashtagNameParams = z.object({ name: z.string().trim().min(1).max(100) });

export const feedQuery = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

// ─── Reactions ─────────────────────────────────────────────
export const reactSchema = z.object({ type: reactionType.optional() });
export type ReactInput = z.infer<typeof reactSchema>;

// ─── Comments ──────────────────────────────────────────────
export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: uuid.nullable().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
