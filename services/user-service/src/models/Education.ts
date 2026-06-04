import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

class Education extends Model<
  InferAttributes<Education>,
  InferCreationAttributes<Education>
> {
  declare id: CreationOptional<string>;
  declare profileId: string;
  declare school: string;
  declare degree: string | null;
  declare fieldOfStudy: string | null;
  declare startYear: number;
  declare endYear: number | null;
  declare grade: string | null;
  declare activities: string | null;
  declare createdAt: CreationOptional<Date>;
}

Education.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    profileId: { type: DataTypes.UUID, allowNull: false, field: 'profile_id' },
    school: { type: DataTypes.STRING, allowNull: false },
    degree: { type: DataTypes.STRING, allowNull: true },
    fieldOfStudy: { type: DataTypes.STRING, allowNull: true, field: 'field_of_study' },
    startYear: { type: DataTypes.INTEGER, allowNull: false, field: 'start_year' },
    endYear: { type: DataTypes.INTEGER, allowNull: true, field: 'end_year' },
    grade: { type: DataTypes.STRING, allowNull: true },
    activities: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'educations',
    updatedAt: false,
    indexes: [{ fields: ['profile_id'] }],
  },
);

export { Education };
