import { Op } from 'sequelize';
import { Message, MessageType } from '../models';

class MessageRepository {
  public findById = (id: string): Promise<Message | null> => {
    return Message.findByPk(id);
  };

  /** Non-deleted messages in a conversation, newest first, keyset-paginated. */
  public listByConversation = (
    conversationId: string,
    limit: number,
    cursor?: string,
  ): Promise<Message[]> => {
    return Message.findAll({
      where: {
        conversationId,
        deletedAt: null,
        ...(cursor ? { createdAt: { [Op.lt]: new Date(cursor) } } : {}),
      },
      order: [['createdAt', 'DESC']],
      limit: limit + 1,
    });
  };

  public create = (data: {
    conversationId: string;
    senderId: string;
    content?: string | null;
    mediaUrl?: string | null;
    messageType?: MessageType;
  }): Promise<Message> => {
    return Message.create({
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content ?? null,
      mediaUrl: data.mediaUrl ?? null,
      messageType: data.messageType ?? 'TEXT',
    });
  };

  public update = (row: Message, changes: Partial<Message>): Promise<Message> => {
    return row.update(changes);
  };
}

export const messageRepository = new MessageRepository();
