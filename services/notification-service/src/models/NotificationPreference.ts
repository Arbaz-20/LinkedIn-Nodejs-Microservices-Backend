import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

/** Per-user delivery and category preferences for notifications. */
class NotificationPreference extends Model<
  InferAttributes<NotificationPreference>,
  InferCreationAttributes<NotificationPreference>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare inApp: CreationOptional<boolean>;
  declare email: CreationOptional<boolean>;
  declare push: CreationOptional<boolean>;
  declare connections: CreationOptional<boolean>;
  declare messages: CreationOptional<boolean>;
  declare posts: CreationOptional<boolean>;
  declare jobs: CreationOptional<boolean>;
}

NotificationPreference.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'user_id' },
    inApp: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'in_app' },
    email: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    push: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    connections: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    messages: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    posts: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    jobs: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'notification_preferences',
    timestamps: false,
  },
);

export { NotificationPreference };
