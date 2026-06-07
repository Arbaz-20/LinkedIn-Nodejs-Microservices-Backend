import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

/** A 1:1 or group conversation thread. */
class Conversation extends Model<InferAttributes<Conversation>, InferCreationAttributes<Conversation>> {
  declare id: CreationOptional<string>;
  declare isGroup: CreationOptional<boolean>;
  declare groupName: string | null;
  declare groupAvatar: string | null;
  declare lastMessageAt: Date | null;
  declare createdAt: CreationOptional<Date>;
}

Conversation.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    isGroup: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_group' },
    groupName: { type: DataTypes.STRING, allowNull: true, field: 'group_name' },
    groupAvatar: { type: DataTypes.STRING, allowNull: true, field: 'group_avatar' },
    lastMessageAt: { type: DataTypes.DATE, allowNull: true, field: 'last_message_at' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'conversations',
    updatedAt: false,
    indexes: [{ fields: [{ name: 'last_message_at', order: 'DESC' }] }],
  },
);

export { Conversation };
