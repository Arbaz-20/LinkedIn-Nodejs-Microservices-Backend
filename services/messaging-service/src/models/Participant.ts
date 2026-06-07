import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

/** Membership of a user in a conversation, with per-user read/mute state. */
class Participant extends Model<InferAttributes<Participant>, InferCreationAttributes<Participant>> {
  declare id: CreationOptional<string>;
  declare conversationId: string;
  declare userId: string;
  declare joinedAt: CreationOptional<Date>;
  declare lastReadAt: Date | null;
  declare isMuted: CreationOptional<boolean>;
}

Participant.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    conversationId: { type: DataTypes.UUID, allowNull: false, field: 'conversation_id' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    joinedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'joined_at' },
    lastReadAt: { type: DataTypes.DATE, allowNull: true, field: 'last_read_at' },
    isMuted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_muted' },
  },
  {
    sequelize,
    tableName: 'participants',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['conversation_id', 'user_id'] },
      { fields: ['user_id'] },
    ],
  },
);

export { Participant };
