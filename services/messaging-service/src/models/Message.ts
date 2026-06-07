import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';

/** A single message within a conversation. Soft-deleted via deletedAt. */
class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
  declare id: CreationOptional<string>;
  declare conversationId: string;
  declare senderId: string;
  declare content: string | null;
  declare mediaUrl: string | null;
  declare messageType: CreationOptional<MessageType>;
  declare isEdited: CreationOptional<boolean>;
  declare deletedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
}

Message.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    conversationId: { type: DataTypes.UUID, allowNull: false, field: 'conversation_id' },
    senderId: { type: DataTypes.UUID, allowNull: false, field: 'sender_id' },
    content: { type: DataTypes.TEXT, allowNull: true },
    mediaUrl: { type: DataTypes.STRING, allowNull: true, field: 'media_url' },
    messageType: {
      type: DataTypes.ENUM('TEXT', 'IMAGE', 'FILE', 'SYSTEM'),
      allowNull: false,
      defaultValue: 'TEXT',
      field: 'message_type',
    },
    isEdited: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_edited' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'messages',
    updatedAt: false,
    indexes: [{ fields: ['conversation_id', { name: 'created_at', order: 'DESC' }] }],
  },
);

export { Message };
export type { MessageType };
