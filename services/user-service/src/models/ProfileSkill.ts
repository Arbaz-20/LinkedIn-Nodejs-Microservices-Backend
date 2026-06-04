import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

/** Join row linking a profile to a skill, with an endorsement counter. */
class ProfileSkill extends Model<
  InferAttributes<ProfileSkill>,
  InferCreationAttributes<ProfileSkill>
> {
  declare profileId: string;
  declare skillId: string;
  declare endorsements: CreationOptional<number>;
}

ProfileSkill.init(
  {
    profileId: { type: DataTypes.UUID, primaryKey: true, field: 'profile_id' },
    skillId: { type: DataTypes.UUID, primaryKey: true, field: 'skill_id' },
    endorsements: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: 'profile_skills',
    timestamps: false,
  },
);

export { ProfileSkill };
