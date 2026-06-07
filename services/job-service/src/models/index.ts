import { Company } from './Company';
import { Job } from './Job';
import { Application } from './Application';
import { SavedJob } from './SavedJob';

// ─── Associations ──────────────────────────────────────────
Company.hasMany(Job, { foreignKey: 'companyId', onDelete: 'CASCADE', as: 'jobs' });
Job.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Job.hasMany(Application, { foreignKey: 'jobId', onDelete: 'CASCADE', as: 'applications' });
Application.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

Job.hasMany(SavedJob, { foreignKey: 'jobId', onDelete: 'CASCADE', as: 'savedBy' });
SavedJob.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

export { Company, Job, Application, SavedJob };
export type { LocationType, EmploymentType, ExperienceLevel } from './Job';
export type { ApplicationStatus } from './Application';
