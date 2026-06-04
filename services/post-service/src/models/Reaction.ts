import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

type ReactionType = 'LIKE' | 'CELEBRATE' | 'SUPPORT' | 'LOVE' | 'INSIGHTFUL' | 'FUNNY';

class Reaction extends Model<InferAttributes<Reaction>, InferCreationAttributes<Reaction>> {
  declare id: CreationOptional<string>;
  declare postId: string;
  declare userId: string;
  declare type: CreationOptional<ReactionType>;
}

Reaction.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    postId: { type: DataTypes.UUID, allowNull: false, field: 'post_id' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    type: {
      type: DataTypes.ENUM('LIKE', 'CELEBRATE', 'SUPPORT', 'LOVE', 'INSIGHTFUL', 'FUNNY'),
      allowNull: false,
      defaultValue: 'LIKE',
    },
  },
  {
    sequelize,
    tableName: 'reactions',
    timestamps: false,
    indexes: [{ unique: true, fields: ['post_id', 'user_id'] }],
  },
);

export { Reaction };
export type { ReactionType };
