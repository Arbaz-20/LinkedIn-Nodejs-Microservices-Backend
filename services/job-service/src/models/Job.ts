import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';

type LocationType = 'ONSITE' | 'REMOTE' | 'HYBRID';
type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE';
type ExperienceLevel = 'ENTRY' | 'ASSOCIATE' | 'MID_SENIOR' | 'DIRECTOR' | 'EXECUTIVE';

/** A job posting owned by a company and created by a recruiter (poster). */
class Job extends Model<InferAttributes<Job>, InferCreationAttributes<Job>> {
  declare id: CreationOptional<string>;
  declare companyId: string;
  declare posterId: string;
  declare title: string;
  declare description: string;
  declare location: string | null;
  declare locationType: CreationOptional<LocationType>;
  declare employmentType: EmploymentType;
  declare experienceLevel: ExperienceLevel;
  declare salaryMin: number | null;
  declare salaryMax: number | null;
  declare salaryCurrency: CreationOptional<string | null>;
  declare skills: CreationOptional<string[]>;
  declare isActive: CreationOptional<boolean>;
  declare applicantsCount: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Job.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    posterId: { type: DataTypes.UUID, allowNull: false, field: 'poster_id' },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: true },
    locationType: {
      type: DataTypes.ENUM('ONSITE', 'REMOTE', 'HYBRID'),
      allowNull: false,
      defaultValue: 'ONSITE',
      field: 'location_type',
    },
    employmentType: {
      type: DataTypes.ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'),
      allowNull: false,
      field: 'employment_type',
    },
    experienceLevel: {
      type: DataTypes.ENUM('ENTRY', 'ASSOCIATE', 'MID_SENIOR', 'DIRECTOR', 'EXECUTIVE'),
      allowNull: false,
      field: 'experience_level',
    },
    salaryMin: { type: DataTypes.INTEGER, allowNull: true, field: 'salary_min' },
    salaryMax: { type: DataTypes.INTEGER, allowNull: true, field: 'salary_max' },
    salaryCurrency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'USD', field: 'salary_currency' },
    skills: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    applicantsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'applicants_count' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'jobs',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['is_active', 'created_at'] },
    ],
  },
);

export { Job };
export type { LocationType, EmploymentType, ExperienceLevel };
