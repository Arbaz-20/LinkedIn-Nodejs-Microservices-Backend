import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

type Role = 'USER' | 'ADMIN' | 'RECRUITER';

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare passwordHash: string | null;
  declare isVerified: CreationOptional<boolean>;
  declare verifyToken: string | null;
  declare resetToken: string | null;
  declare resetExpiry: Date | null;
  declare role: CreationOptional<Role>;
  declare lastLoginAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    passwordHash: { type: DataTypes.STRING, allowNull: true, field: 'password_hash' },
    isVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_verified' },
    verifyToken: { type: DataTypes.STRING, allowNull: true, field: 'verify_token' },
    resetToken: { type: DataTypes.STRING, allowNull: true, field: 'reset_token' },
    resetExpiry: { type: DataTypes.DATE, allowNull: true, field: 'reset_expiry' },
    role: { type: DataTypes.ENUM('USER', 'ADMIN', 'RECRUITER'), allowNull: false, defaultValue: 'USER' },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'users',
  },
);

export { User };
export type { Role };
