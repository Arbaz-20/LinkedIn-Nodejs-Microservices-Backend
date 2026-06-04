import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

/** A directed block edge (blocker → blocked). */
class Block extends Model<InferAttributes<Block>, InferCreationAttributes<Block>> {
  declare id: CreationOptional<string>;
  declare blockerId: string;
  declare blockedId: string;
  declare createdAt: CreationOptional<Date>;
}

Block.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    blockerId: { type: DataTypes.UUID, allowNull: false, field: 'blocker_id' },
    blockedId: { type: DataTypes.UUID, allowNull: false, field: 'blocked_id' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'blocks',
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['blocker_id', 'blocked_id'] },
      { fields: ['blocked_id'] },
    ],
  },
);

export { Block };
