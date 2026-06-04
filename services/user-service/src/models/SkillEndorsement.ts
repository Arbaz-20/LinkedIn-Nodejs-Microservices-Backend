import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

/**
 * One row per (endorser, profile, skill). The unique constraint makes
 * endorsements idempotent — a user can endorse a given skill at most once.
 */
class SkillEndorsement extends Model<
  InferAttributes<SkillEndorsement>,
  InferCreationAttributes<SkillEndorsement>
> {
  declare id: CreationOptional<string>;
  declare endorserId: string;
  declare profileId: string;
  declare skillId: string;
  declare createdAt: CreationOptional<Date>;
}

SkillEndorsement.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    endorserId: { type: DataTypes.UUID, allowNull: false, field: 'endorser_id' },
    profileId: { type: DataTypes.UUID, allowNull: false, field: 'profile_id' },
    skillId: { type: DataTypes.UUID, allowNull: false, field: 'skill_id' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'skill_endorsements',
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['endorser_id', 'profile_id', 'skill_id'] },
      { fields: ['profile_id', 'skill_id'] },
    ],
  },
);

export { SkillEndorsement };
