import { Op } from 'sequelize';
import { Participant } from '../models';

class ParticipantRepository {
  public findByConversationAndUser = (
    conversationId: string,
    userId: string,
  ): Promise<Participant | null> => {
    return Participant.findOne({ where: { conversationId, userId } });
  };

  public listByConversation = (conversationId: string): Promise<Participant[]> => {
    return Participant.findAll({ where: { conversationId } });
  };

  public create = (data: { conversationId: string; userId: string }): Promise<Participant> => {
    return Participant.create({
      conversationId: data.conversationId,
      userId: data.userId,
      lastReadAt: null,
    });
  };

  public bulkCreate = (
    rows: { conversationId: string; userId: string }[],
  ): Promise<Participant[]> => {
    return Participant.bulkCreate(rows.map((r) => ({ ...r, lastReadAt: null })));
  };

  public update = (row: Participant, changes: Partial<Participant>): Promise<Participant> => {
    return row.update(changes);
  };

  /**
   * Find an existing non-group conversation whose participant set is EXACTLY the
   * two given users (used to keep 1:1 conversations idempotent).
   */
  public findDirectConversationId = async (
    userA: string,
    userB: string,
  ): Promise<string | null> => {
    const rows = await Participant.findAll({
      attributes: ['conversationId'],
      where: { userId: { [Op.in]: [userA, userB] } },
    });
    // Candidate conversations are those containing either user. The direct
    // conversation is one that contains both users and exactly two participants.
    const candidateIds = [...new Set(rows.map((r) => r.conversationId))];
    for (const conversationId of candidateIds) {
      const members = await this.listByConversation(conversationId);
      const memberIds = members.map((m) => m.userId);
      if (members.length === 2 && memberIds.includes(userA) && memberIds.includes(userB)) {
        return conversationId;
      }
    }
    return null;
  };
}

export const participantRepository = new ParticipantRepository();
