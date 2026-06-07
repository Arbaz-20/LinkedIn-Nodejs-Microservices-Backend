import { z } from 'zod';

const uuid = z.string().uuid();
const messageType = z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']);

export const idParams = z.object({ id: uuid });
export const messageParams = z.object({ id: uuid, msgId: uuid });

/** Start a conversation. The creator is added implicitly. */
export const createConversationSchema = z.object({
  participantIds: z.array(uuid).min(1).max(50),
  isGroup: z.boolean().optional(),
  groupName: z.string().trim().max(100).optional(),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

/** Send a message — at least one of content / mediaUrl is required. */
export const sendMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(5000).optional(),
    mediaUrl: z.string().url().max(2048).optional(),
    messageType: messageType.optional(),
  })
  .refine((v) => Boolean(v.content) || Boolean(v.mediaUrl), {
    message: 'Either content or mediaUrl is required',
  });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const editMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});
export type EditMessageInput = z.infer<typeof editMessageSchema>;

/** Cursor pagination query for listing messages. */
export const listMessagesQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
