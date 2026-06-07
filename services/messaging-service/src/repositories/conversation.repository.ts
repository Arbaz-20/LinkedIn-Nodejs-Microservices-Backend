import { Conversation, Participant } from '../models';

class ConversationRepository {
  public findById = (id: string): Promise<Conversation | null> => {
    return Conversation.findByPk(id);
  };

  /** A conversation with its participants eagerly loaded. */
  public findByIdWithParticipants = (id: string): Promise<Conversation | null> => {
    return Conversation.findByPk(id, {
      include: [{ model: Participant, as: 'participants' }],
    });
  };

  /** Conversations the user participates in, newest activity first. */
  public listForUser = async (userId: string): Promise<Conversation[]> => {
    const memberships = await Participant.findAll({
      where: { userId },
      attributes: ['conversationId'],
    });
    const ids = memberships.map((m) => m.conversationId);
    if (ids.length === 0) return [];
    return Conversation.findAll({
      where: { id: ids },
      include: [{ model: Participant, as: 'participants' }],
      order: [['lastMessageAt', 'DESC']],
    });
  };

  public create = (data: {
    isGroup?: boolean;
    groupName?: string | null;
  }): Promise<Conversation> => {
    return Conversation.create({
      isGroup: data.isGroup ?? false,
      groupName: data.groupName ?? null,
      groupAvatar: null,
      lastMessageAt: null,
    });
  };

  public update = (row: Conversation, changes: Partial<Conversation>): Promise<Conversation> => {
    return row.update(changes);
  };
}

export const conversationRepository = new ConversationRepository();
