import { Application, ApplicationStatus, Job } from '../models';

class ApplicationRepository {
  public findById = (id: string): Promise<Application | null> => {
    return Application.findByPk(id);
  };

  public findByJobAndApplicant = (jobId: string, applicantId: string): Promise<Application | null> => {
    return Application.findOne({ where: { jobId, applicantId } });
  };

  public create = (data: {
    jobId: string;
    applicantId: string;
    resumeUrl?: string | null;
    coverLetter?: string | null;
  }): Promise<Application> => {
    return Application.create({
      jobId: data.jobId,
      applicantId: data.applicantId,
      resumeUrl: data.resumeUrl ?? null,
      coverLetter: data.coverLetter ?? null,
    });
  };

  public update = (row: Application, changes: Partial<Application>): Promise<Application> => {
    return row.update(changes);
  };

  /** All applications submitted to a job, newest first. */
  public listByJob = (jobId: string): Promise<Application[]> => {
    return Application.findAll({ where: { jobId }, order: [['createdAt', 'DESC']] });
  };

  /** Current user's applications with the job included, newest first. */
  public listByApplicant = (applicantId: string): Promise<Application[]> => {
    return Application.findAll({
      where: { applicantId },
      include: [{ model: Job, as: 'job' }],
      order: [['createdAt', 'DESC']],
    });
  };

  public updateStatus = (row: Application, status: ApplicationStatus): Promise<Application> => {
    return row.update({ status });
  };
}

export const applicationRepository = new ApplicationRepository();
