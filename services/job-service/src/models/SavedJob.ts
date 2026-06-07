import { DataTypes, InferAttributes, InferCreationAttributes, Model, CreationOptional } from 'sequelize';
import { sequelize } from '../db/sequelize';
import { Job } from './Job';

/** A bookmark linking a user to a saved job (composite primary key). */
class SavedJob extends Model<InferAttributes<SavedJob>, InferCreationAttributes<SavedJob>> {
  declare userId: string;
  declare jobId: string;
  declare createdAt: CreationOptional<Date>;

  declare job?: Job;
}

SavedJob.init(
  {
    userId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'user_id' },
    jobId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'job_id' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'saved_jobs',
    updatedAt: false,
  },
);

export { SavedJob };
