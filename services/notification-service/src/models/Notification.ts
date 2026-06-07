import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

type NotificationType =
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'POST_LIKE'
  | 'POST_COMMENT'
  | 'COMMENT_REPLY'
  | 'ENDORSEMENT'
  | 'PROFILE_VIEW'
  | 'JOB_RECOMMENDATION'
  | 'MESSAGE_RECEIVED'
  | 'MENTION';

const NOTIFICATION_TYPES: NotificationType[] = [
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'POST_LIKE',
  'POST_COMMENT',
  'COMMENT_REPLY',
  'ENDORSEMENT',
  'PROFILE_VIEW',
  'JOB_RECOMMENDATION',
  'MESSAGE_RECEIVED',
  'MENTION',
];

/** A single in-app notification delivered to a recipient. */
class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  declare id: CreationOptional<string>;
  declare recipientId: string;
  declare actorId: string | null;
  declare type: NotificationType;
  declare entityType: string | null;
  declare entityId: string | null;
  declare message: string;
  declare isRead: CreationOptional<boolean>;
  declare readAt: Date | null;
  declare metadata: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
}

Notification.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    recipientId: { type: DataTypes.UUID, allowNull: false, field: 'recipient_id' },
    actorId: { type: DataTypes.UUID, allowNull: true, field: 'actor_id' },
    type: { type: DataTypes.ENUM(...NOTIFICATION_TYPES), allowNull: false },
    entityType: { type: DataTypes.STRING, allowNull: true, field: 'entity_type' },
    entityId: { type: DataTypes.STRING, allowNull: true, field: 'entity_id' },
    message: { type: DataTypes.STRING, allowNull: false },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read' },
    readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'notifications',
    updatedAt: false,
    indexes: [{ fields: ['recipient_id', 'is_read', 'created_at'] }],
  },
);

export { Notification, NOTIFICATION_TYPES };
export type { NotificationType };
