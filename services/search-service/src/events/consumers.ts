import {
  registerConsumer,
  EXCHANGES,
  ROUTING_KEYS,
  QUEUES,
  DLX,
  createLogger,
} from '@linkedin-clone/shared';
import { config } from '../config';
import { indexingService } from '../services/indexing.service';

const logger = createLogger(config.SERVICE_NAME);

/** user.registered / user.updated payloads (fields vary by event). */
interface UserEvent {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  avatarUrl?: string;
  location?: string;
  industry?: string;
}

/** post.created / post.updated / post.deleted payloads. */
interface PostEvent {
  postId: string;
  authorId?: string;
  content?: string;
  createdAt?: string;
}

/** job.created payload. */
interface JobEvent {
  jobId: string;
  companyId?: string;
  title?: string;
  description?: string;
  location?: string;
  skills?: string[];
}

/**
 * Register every RabbitMQ consumer that feeds the search indices. Handlers may
 * throw — the shared retry/DLQ machinery will dead-letter poison messages.
 */
export async function registerConsumers(): Promise<void> {
  // ─── Users ─────────────────────────────────────────────────
  await registerConsumer<UserEvent>(
    {
      exchange: EXCHANGES.USER_EVENTS,
      queue: QUEUES.SEARCH_INDEX_USER,
      routingKeys: [ROUTING_KEYS.USER_REGISTERED, ROUTING_KEYS.USER_UPDATED],
      dlx: DLX.SEARCH,
      dlq: QUEUES.DLQ_SEARCH,
    },
    async (envelope) => {
      await indexingService.indexUser(envelope.data);
      logger.info({ type: envelope.type, userId: envelope.data.userId }, 'handled user event');
    },
  );

  // ─── Posts ─────────────────────────────────────────────────
  await registerConsumer<PostEvent>(
    {
      exchange: EXCHANGES.POST_EVENTS,
      queue: QUEUES.SEARCH_INDEX_POST,
      routingKeys: [
        ROUTING_KEYS.POST_CREATED,
        ROUTING_KEYS.POST_UPDATED,
        ROUTING_KEYS.POST_DELETED,
      ],
      dlx: DLX.SEARCH,
      dlq: QUEUES.DLQ_SEARCH,
    },
    async (envelope) => {
      if (envelope.type === ROUTING_KEYS.POST_DELETED) {
        await indexingService.removePost(envelope.data.postId);
      } else {
        await indexingService.indexPost(envelope.data);
      }
      logger.info({ type: envelope.type, postId: envelope.data.postId }, 'handled post event');
    },
  );

  // ─── Jobs ──────────────────────────────────────────────────
  await registerConsumer<JobEvent>(
    {
      exchange: EXCHANGES.JOB_EVENTS,
      queue: QUEUES.SEARCH_INDEX_JOB,
      routingKeys: [ROUTING_KEYS.JOB_CREATED],
      dlx: DLX.SEARCH,
      dlq: QUEUES.DLQ_SEARCH,
    },
    async (envelope) => {
      await indexingService.indexJob(envelope.data);
      logger.info({ type: envelope.type, jobId: envelope.data.jobId }, 'handled job event');
    },
  );
}
