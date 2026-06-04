import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

class Hashtag extends Model<InferAttributes<Hashtag>, InferCreationAttributes<Hashtag>> {
  declare id: CreationOptional<string>;
  declare name: string;
}

Hashtag.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
  },
  {
    sequelize,
    tableName: 'hashtags',
    timestamps: false,
  },
);

export { Hashtag };
