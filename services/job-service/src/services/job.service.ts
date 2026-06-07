import { ForbiddenError, NotFoundError, createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { Job } from '../models';
import { jobRepository, JobListFilters } from '../repositories/job.repository';
import { companyService } from './company.service';
import { jobEventPublisher } from '../events/publishers';
import type { CreateJobInput, UpdateJobInput } from '../validators/job.validators';
import type { OffsetPaginationParams } from '@linkedin-clone/shared';

const logger = createLogger(config.SERVICE_NAME);

class JobService {
  public getOrThrow = async (id: string): Promise<Job> => {
    const job = await jobRepository.findById(id);
    if (!job) throw new NotFoundError('Job not found');
    return job;
  };

  public getByIdWithCompany = async (id: string): Promise<Job> => {
    const job = await jobRepository.findByIdWithCompany(id);
    if (!job) throw new NotFoundError('Job not found');
    return job;
  };

  public list = (
    filters: JobListFilters,
    params: OffsetPaginationParams,
  ): Promise<{ rows: Job[]; count: number }> => {
    return jobRepository.listAndCount(filters, params.limit, params.offset);
  };

  public create = async (posterId: string, input: CreateJobInput): Promise<Job> => {
    // Company must exist (404 otherwise).
    await companyService.getByIdOrThrow(input.companyId);

    const job = await jobRepository.create({
      companyId: input.companyId,
      posterId,
      title: input.title,
      description: input.description,
      location: input.location,
      locationType: input.locationType,
      employmentType: input.employmentType,
      experienceLevel: input.experienceLevel,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      salaryCurrency: input.salaryCurrency,
      skills: input.skills,
    });

    // Best-effort event publish — never fail the request on bus errors.
    try {
      await jobEventPublisher.publishJobCreated({
        jobId: job.id,
        companyId: job.companyId,
        title: job.title,
        description: job.description,
        location: job.location,
        skills: job.skills,
      });
    } catch (err) {
      logger.error({ err, jobId: job.id }, 'failed to publish job.created');
    }

    logger.info({ jobId: job.id }, 'job created');
    return job;
  };

  public update = async (
    id: string,
    userId: string,
    role: string,
    input: UpdateJobInput,
  ): Promise<Job> => {
    const job = await this.getOrThrow(id);
    await this.assertCanManage(job, userId, role);
    return jobRepository.update(job, input);
  };

  /** Soft-close a job posting (poster / company admin / ADMIN only). */
  public close = async (id: string, userId: string, role: string): Promise<void> => {
    const job = await this.getOrThrow(id);
    await this.assertCanManage(job, userId, role);
    await jobRepository.update(job, { isActive: false });
    logger.info({ jobId: id }, 'job closed');
  };

  /** Throw 403 unless the user is the poster, a company admin, or an ADMIN. */
  public assertCanManage = async (job: Job, userId: string, role: string): Promise<void> => {
    if (role === 'ADMIN' || job.posterId === userId) return;
    const company = await companyService.getByIdOrThrow(job.companyId);
    if (company.adminIds.includes(userId)) return;
    throw new ForbiddenError('You may not manage this job');
  };
}

export const jobService = new JobService();
