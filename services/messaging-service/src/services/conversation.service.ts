import { ForbiddenError, NotFoundError, createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { Conversation, Participant } from '../models';
import { conversationRepository } from '../repositories/conversation.repository';
import { participantRepository } from '../repositories/participant.repository';
import type { CreateConversationInput } from '../validators/messaging.validators';

const logger = createLogger(config.SERVICE_NAME);

class ConversationService {
  /** Load a conversation (with participants) or throw 404. */
  private getOrThrow = async (id: string): Promise<Conversation> => {
    const row = await conversationRepository.findByIdWithParticipants(id);
    if (!row) throw new NotFoundError('Conversation not found');
    return row;
  };

  /** Assert the user participates in the conversation, or throw 403. */
  public assertParticipant = async (conversationId: string, userId: string): Promise<Participant> => {
    const membership = await participantRepository.findByConversationAndUser(conversationId, userId);
    if (!membership) throw new ForbiddenError('Not a participant of this conversation');
    return membership;
  };

  public list = (userId: string): Promise<Conversation[]> => {
    return conversationRepository.listForUser(userId);
  };

  public getById = async (id: string, userId: string): Promise<Conversation> => {
    const row = await this.getOrThrow(id);
    await this.assertParticipant(id, userId);
    return row;
  };

  /**
   * Start a conversation. The creator is always a participant. For non-group
   * 1:1 chats, an existing conversation between exactly the two users is reused.
   */
  public create = async (creatorId: string, input: CreateConversationInput): Promise<Conversation> => {
    // De-duplicate ids and drop the creator (added implicitly below).
    const others = [...new Set(input.participantIds)].filter((id) => id !== creatorId);
    const memberIds = [...new Set([creatorId, ...others])];

    const isGroup = input.isGroup ?? memberIds.length > 2;

    // Idempotent 1:1 lookup.
    if (!isGroup && memberIds.length === 2) {
      const existingId = await participantRepository.findDirectConversationId(memberIds[0], memberIds[1]);
      if (existingId) return this.getOrThrow(existingId);
    }

    const conversation = await conversationRepository.create({
      isGroup,
      groupName: isGroup ? input.groupName ?? null : null,
    });
    await participantRepository.bulkCreate(
      memberIds.map((userId) => ({ conversationId: conversation.id, userId })),
    );
    logger.info({ conversationId: conversation.id }, 'conversation created');
    return this.getOrThrow(conversation.id);
  };

  /** Mark the requester's participant row as read up to now. */
  public markRead = async (conversationId: string, userId: string): Promise<void> => {
    const membership = await this.assertParticipant(conversationId, userId);
    await participantRepository.update(membership, { lastReadAt: new Date() });
  };
}

export const conversationService = new ConversationService();
