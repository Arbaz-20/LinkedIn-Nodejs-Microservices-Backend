import { publishEvent, EXCHANGES, ROUTING_KEYS } from '@linkedin-clone/shared';
import { config } from '../config';

export interface JobCreatedEvent {
  jobId: string;
  companyId: string;
  title: string;
  description: string;
  location: string | null;
  skills: string[];
}

export interface JobAppliedEvent {
  jobId: string;
  posterId: string;
  applicantId: string;
  applicationId: string;
}

class JobEventPublisher {
  /** search.index.job + notify consumers listen for this. */
  public publishJobCreated = async (data: JobCreatedEvent, correlationId?: string): Promise<void> => {
    await publishEvent(EXCHANGES.JOB_EVENTS, ROUTING_KEYS.JOB_CREATED, data, config.SERVICE_NAME, { correlationId });
  };

  /** notify.job.application consumer listens for this. */
  public publishJobApplied = async (data: JobAppliedEvent, correlationId?: string): Promise<void> => {
    await publishEvent(EXCHANGES.JOB_EVENTS, ROUTING_KEYS.JOB_APPLIED, data, config.SERVICE_NAME, { correlationId });
  };
}

export const jobEventPublisher = new JobEventPublisher();
