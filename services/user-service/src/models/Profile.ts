import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

/** A user profile. Its id mirrors the auth-service user id (1:1). */
class Profile extends Model<InferAttributes<Profile>, InferCreationAttributes<Profile>> {
  declare id: string; // same as auth user id — not auto-generated
  declare firstName: string;
  declare lastName: string;
  declare headline: string | null;
  declare summary: string | null;
  declare avatarUrl: string | null;
  declare bannerUrl: string | null;
  declare location: string | null;
  declare website: string | null;
  declare industry: string | null;
  declare isOpenToWork: CreationOptional<boolean>;
  declare profileViews: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Profile.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    firstName: { type: DataTypes.STRING, allowNull: false, field: 'first_name' },
    lastName: { type: DataTypes.STRING, allowNull: false, field: 'last_name' },
    headline: { type: DataTypes.STRING, allowNull: true },
    summary: { type: DataTypes.TEXT, allowNull: true },
    avatarUrl: { type: DataTypes.STRING, allowNull: true, field: 'avatar_url' },
    bannerUrl: { type: DataTypes.STRING, allowNull: true, field: 'banner_url' },
    location: { type: DataTypes.STRING, allowNull: true },
    website: { type: DataTypes.STRING, allowNull: true },
    industry: { type: DataTypes.STRING, allowNull: true },
    isOpenToWork: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_open_to_work' },
    profileViews: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'profile_views' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'profiles',
  },
);

export { Profile };
