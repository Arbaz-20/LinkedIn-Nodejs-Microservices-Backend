import { Router } from 'express';
import { asyncHandler, validate, requireUser } from '@linkedin-clone/shared';
import { conversationController } from '../controllers/conversation.controller';
import { messageController } from '../controllers/message.controller';
import {
  idParams,
  messageParams,
  createConversationSchema,
  sendMessageSchema,
  editMessageSchema,
  listMessagesQuery,
} from '../validators/messaging.validators';

export const messagingRouter = Router();

// Identity is injected by the gateway; every route requires an authenticated user.
messagingRouter.use(requireUser);

// ─── Conversations ─────────────────────────────────────────
messagingRouter.get('/conversations', asyncHandler(conversationController.list));
messagingRouter.post(
  '/conversations',
  validate({ body: createConversationSchema }),
  asyncHandler(conversationController.create),
);
messagingRouter.get(
  '/conversations/:id',
  validate({ params: idParams }),
  asyncHandler(conversationController.getById),
);
messagingRouter.post(
  '/conversations/:id/read',
  validate({ params: idParams }),
  asyncHandler(conversationController.markRead),
);

// ─── Messages ──────────────────────────────────────────────
messagingRouter.get(
  '/conversations/:id/messages',
  validate({ params: idParams, query: listMessagesQuery }),
  asyncHandler(messageController.list),
);
messagingRouter.post(
  '/conversations/:id/messages',
  validate({ params: idParams, body: sendMessageSchema }),
  asyncHandler(messageController.send),
);
messagingRouter.put(
  '/conversations/:id/messages/:msgId',
  validate({ params: messageParams, body: editMessageSchema }),
  asyncHandler(messageController.edit),
);
messagingRouter.delete(
  '/conversations/:id/messages/:msgId',
  validate({ params: messageParams }),
  asyncHandler(messageController.remove),
);
