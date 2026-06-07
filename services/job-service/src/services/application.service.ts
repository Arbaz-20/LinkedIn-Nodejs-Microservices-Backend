import { ConflictError, NotFoundError, createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { Application, ApplicationStatus, SavedJob } from '../models';
import { applicationRepository } from '../repositories/application.repository';
import { jobRepository } from '../repositories/job.repository';
import { savedJobRepository } from '../repositories/savedJob.repository';
import { jobService } from './job.service';
import { jobEventPublisher } from '../events/publishers';
import type { ApplyInput } from '../validators/job.validators';

const logger = createLogger(config.SERVICE_NAME);

class ApplicationService {
  /** Apply to an active job. Unique per (job, applicant). */
  public apply = async (jobId: string, applicantId: string, input: ApplyInput): Promise<Application> => {
    const job = await jobService.getOrThrow(jobId);
    if (!job.isActive) throw new ConflictError('This job is no longer accepting applications');

    const existing = await applicationRepository.findByJobAndApplicant(jobId, applicantId);
    if (existing) throw new ConflictError('You have already applied to this job');

    const application = await applicationRepository.create({
      jobId,
      applicantId,
      resumeUrl: input.resumeUrl,
      coverLetter: input.coverLetter,
    });
    await jobRepository.incrementApplicants(jobId, 1);

    try {
      await jobEventPublisher.publishJobApplied({
        jobId,
        posterId: job.posterId,
        applicantId,
        applicationId: application.id,
      });
    } catch (err) {
      logger.error({ err, applicationId: application.id }, 'failed to publish job.applied');
    }

    logger.info({ applicationId: application.id, jobId }, 'application submitted');
    return application;
  };

  /** List applications to a job (poster / company admin / ADMIN only). */
  public listForJob = async (
    jobId: string,
    userId: string,
    role: string,
  ): Promise<Application[]> => {
    const job = await jobService.getOrThrow(jobId);
    await jobService.assertCanManage(job, userId, role);
    return applicationRepository.listByJob(jobId);
  };

  public listMine = (applicantId: string): Promise<Application[]> => {
    return applicationRepository.listByApplicant(applicantId);
  };

  /** Update an application's status (the job's poster / company admin / ADMIN only). */
  public updateStatus = async (
    appId: string,
    userId: string,
    role: string,
    status: ApplicationStatus,
  ): Promise<Application> => {
    const application = await applicationRepository.findById(appId);
    if (!application) throw new NotFoundError('Application not found');

    const job = await jobService.getOrThrow(application.jobId);
    await jobService.assertCanManage(job, userId, role);

    return applicationRepository.updateStatus(application, status);
  };

  // ─── Saved jobs ──────────────────────────────────────────
  public save = async (userId: string, jobId: string): Promise<{ saved: SavedJob; created: boolean }> => {
    await jobService.getOrThrow(jobId);
    return savedJobRepository.findOrCreate(userId, jobId);
  };

  public unsave = async (userId: string, jobId: string): Promise<void> => {
    await savedJobRepository.remove(userId, jobId);
  };

  public listSaved = (userId: string): Promise<SavedJob[]> => {
    return savedJobRepository.listByUser(userId);
  };
}

export const applicationService = new ApplicationService();
