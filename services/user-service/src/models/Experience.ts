import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

class Experience extends Model<
  InferAttributes<Experience>,
  InferCreationAttributes<Experience>
> {
  declare id: CreationOptional<string>;
  declare profileId: string;
  declare title: string;
  declare company: string;
  declare companyLogo: string | null;
  declare location: string | null;
  declare startDate: Date;
  declare endDate: Date | null;
  declare isCurrent: CreationOptional<boolean>;
  declare description: string | null;
  declare createdAt: CreationOptional<Date>;
}

Experience.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    profileId: { type: DataTypes.UUID, allowNull: false, field: 'profile_id' },
    title: { type: DataTypes.STRING, allowNull: false },
    company: { type: DataTypes.STRING, allowNull: false },
    companyLogo: { type: DataTypes.STRING, allowNull: true, field: 'company_logo' },
    location: { type: DataTypes.STRING, allowNull: true },
    startDate: { type: DataTypes.DATE, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATE, allowNull: true, field: 'end_date' },
    isCurrent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_current' },
    description: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'experiences',
    updatedAt: false,
    indexes: [{ fields: ['profile_id'] }],
  },
);

export { Experience };
