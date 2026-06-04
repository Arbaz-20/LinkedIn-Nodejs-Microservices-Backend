import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

/** A directed follow edge (follower → following). Independent of connections. */
class Follow extends Model<InferAttributes<Follow>, InferCreationAttributes<Follow>> {
  declare id: CreationOptional<string>;
  declare followerId: string;
  declare followingId: string;
  declare createdAt: CreationOptional<Date>;
}

Follow.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    followerId: { type: DataTypes.UUID, allowNull: false, field: 'follower_id' },
    followingId: { type: DataTypes.UUID, allowNull: false, field: 'following_id' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'follows',
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['follower_id', 'following_id'] },
      { fields: ['following_id'] },
    ],
  },
);

export { Follow };
