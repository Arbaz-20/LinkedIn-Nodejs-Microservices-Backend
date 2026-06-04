import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';
import { User } from './User';

class RefreshToken extends Model<
  InferAttributes<RefreshToken>,
  InferCreationAttributes<RefreshToken>
> {
  declare id: CreationOptional<string>;
  declare token: string;
  declare userId: string;
  declare deviceInfo: string | null;
  declare expiresAt: Date;
  declare createdAt: CreationOptional<Date>;
}

RefreshToken.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    deviceInfo: { type: DataTypes.STRING, allowNull: true, field: 'device_info' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    updatedAt: false,
    indexes: [{ fields: ['user_id'] }],
  },
);

// Associations
User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

export { RefreshToken };
