import { ForbiddenError, NotFoundError, buildCursorPage, createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { Message } from '../models';
import { messageRepository } from '../repositories/message.repository';
import { participantRepository } from '../repositories/participant.repository';
import { conversationRepository } from '../repositories/conversation.repository';
import { conversationService } from './conversation.service';
import { messageEventPublisher } from '../events/publishers';
import type { SendMessageInput } from '../validators/messaging.validators';

const logger = createLogger(config.SERVICE_NAME);

export interface MessagePage {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

class MessageService {
  /** Load a message belonging to the conversation, or throw 404. */
  private getOrThrow = async (conversationId: string, msgId: string): Promise<Message> => {
    const row = await messageRepository.findById(msgId);
    if (!row || row.conversationId !== conversationId || row.deletedAt) {
      throw new NotFoundError('Message not found');
    }
    return row;
  };

  public list = async (
    conversationId: string,
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<MessagePage> => {
    await conversationService.assertParticipant(conversationId, userId);
    const rows = await messageRepository.listByConversation(conversationId, limit, cursor);
    const { items, nextCursor, hasMore } = buildCursorPage(rows, limit, (m) => m.createdAt.toISOString());
    return { messages: items, nextCursor, hasMore };
  };

  /** Send a message, bump conversation activity, and emit message.sent. */
  public send = async (
    conversationId: string,
    senderId: string,
    input: SendMessageInput,
  ): Promise<Message> => {
    await conversationService.assertParticipant(conversationId, senderId);
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) throw new NotFoundError('Conversation not found');

    const message = await messageRepository.create({
      conversationId,
      senderId,
      content: input.content,
      mediaUrl: input.mediaUrl,
      messageType: input.messageType,
    });
    await conversationRepository.update(conversation, { lastMessageAt: new Date() });

    // Best-effort notification — a bus hiccup must not fail the request.
    try {
      const participants = await participantRepository.listByConversation(conversationId);
      const recipientIds = participants.map((p) => p.userId).filter((id) => id !== senderId);
      const preview = input.content ?? (input.mediaUrl ? '[media]' : '');
      await messageEventPublisher.publishSent({
        conversationId,
        messageId: message.id,
        senderId,
        recipientIds,
        preview,
      });
    } catch (err) {
      logger.warn({ err, messageId: message.id }, 'failed to publish message.sent');
    }

    logger.info({ messageId: message.id, conversationId }, 'message sent');
    return message;
  };

  /** Edit a message — only the sender may edit. */
  public edit = async (
    conversationId: string,
    msgId: string,
    userId: string,
    content: string,
  ): Promise<Message> => {
    const row = await this.getOrThrow(conversationId, msgId);
    if (row.senderId !== userId) throw new ForbiddenError('Only the sender can edit this message');
    return messageRepository.update(row, { content, isEdited: true });
  };

  /** Soft-delete a message — only the sender may delete. */
  public remove = async (conversationId: string, msgId: string, userId: string): Promise<void> => {
    const row = await this.getOrThrow(conversationId, msgId);
    if (row.senderId !== userId) throw new ForbiddenError('Only the sender can delete this message');
    await messageRepository.update(row, { deletedAt: new Date() });
  };
}

export const messageService = new MessageService();
