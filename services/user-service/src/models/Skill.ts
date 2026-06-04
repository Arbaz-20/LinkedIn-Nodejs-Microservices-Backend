import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

/** Canonical skill taxonomy entry (shared across profiles). */
class Skill extends Model<InferAttributes<Skill>, InferCreationAttributes<Skill>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare category: string | null;
}

Skill.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    category: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    tableName: 'skills',
    timestamps: false,
  },
);

export { Skill };
