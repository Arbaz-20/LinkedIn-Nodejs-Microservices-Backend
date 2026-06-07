import { Conversation } from './Conversation';
import { Participant } from './Participant';
import { Message } from './Message';

// ─── Associations ──────────────────────────────────────────
Conversation.hasMany(Participant, { foreignKey: 'conversationId', onDelete: 'CASCADE', as: 'participants' });
Participant.belongsTo(Conversation, { foreignKey: 'conversationId' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', onDelete: 'CASCADE', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

export { Conversation, Participant, Message };
export type { MessageType } from './Message';
