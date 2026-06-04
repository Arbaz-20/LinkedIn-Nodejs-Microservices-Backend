import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

/** A directed connection request between two users (requester → addressee). */
class Connection extends Model<InferAttributes<Connection>, InferCreationAttributes<Connection>> {
  declare id: CreationOptional<string>;
  declare requesterId: string;
  declare addresseeId: string;
  declare status: CreationOptional<ConnectionStatus>;
  declare note: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Connection.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    requesterId: { type: DataTypes.UUID, allowNull: false, field: 'requester_id' },
    addresseeId: { type: DataTypes.UUID, allowNull: false, field: 'addressee_id' },
    status: {
      type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    note: { type: DataTypes.STRING, allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'connections',
    indexes: [
      { unique: true, fields: ['requester_id', 'addressee_id'] },
      { fields: ['addressee_id', 'status'] },
      { fields: ['requester_id', 'status'] },
    ],
  },
);

export { Connection };
export type { ConnectionStatus };
