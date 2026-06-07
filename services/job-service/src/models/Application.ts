import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';
import { Job } from './Job';

type ApplicationStatus = 'SUBMITTED' | 'REVIEWED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED' | 'WITHDRAWN';

/** A candidate's application to a job. */
class Application extends Model<InferAttributes<Application>, InferCreationAttributes<Application>> {
  declare id: CreationOptional<string>;
  declare jobId: string;
  declare applicantId: string;
  declare resumeUrl: string | null;
  declare coverLetter: string | null;
  declare status: CreationOptional<ApplicationStatus>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare job?: Job;
}

Application.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    jobId: { type: DataTypes.UUID, allowNull: false, field: 'job_id' },
    applicantId: { type: DataTypes.UUID, allowNull: false, field: 'applicant_id' },
    resumeUrl: { type: DataTypes.STRING, allowNull: true, field: 'resume_url' },
    coverLetter: { type: DataTypes.TEXT, allowNull: true, field: 'cover_letter' },
    status: {
      type: DataTypes.ENUM('SUBMITTED', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED', 'WITHDRAWN'),
      allowNull: false,
      defaultValue: 'SUBMITTED',
    },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'applications',
    indexes: [
      { unique: true, fields: ['job_id', 'applicant_id'] },
      { fields: ['applicant_id'] },
    ],
  },
);

export { Application };
export type { ApplicationStatus };
