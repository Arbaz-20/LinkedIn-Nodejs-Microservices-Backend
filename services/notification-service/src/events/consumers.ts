import {
  registerConsumer,
  EXCHANGES,
  ROUTING_KEYS,
  QUEUES,
  DLX,
  createLogger,
} from '@linkedin-clone/shared';
import { config } from '../config';
import { notificationService } from '../services/notification.service';
import { preferenceService } from '../services/preference.service';
import { emailService } from '../services/email.service';

const logger = createLogger(config.SERVICE_NAME);

// ─── Event payload interfaces ───────────────────────────────────────────────

/** connection.events → connection.requested */
interface ConnectionRequestedEvent {
  connectionId: string;
  requesterId: string;
  addresseeId: string;
}

/** connection.events → connection.accepted */
interface ConnectionAcceptedEvent {
  connectionId: string;
  requesterId: string;
  addresseeId: string;
}

/** post.events → post.reacted */
interface PostReactedEvent {
  postId: string;
  authorId: string;
  userId: string;
  reactionType: string;
}

/** post.events → post.commented */
interface PostCommentedEvent {
  postId: string;
  authorId: string;
  commentId: string;
  userId: string;
}

/** notification.direct → message.sent */
interface MessageSentEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  recipientIds: string[];
  preview?: string;
}

/** job.events → job.applied */
interface JobAppliedEvent {
  jobId: string;
  posterId: string;
  applicantId: string;
  applicationId: string;
}

/** notification.direct → email */
interface EmailDispatchEvent {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Register all RabbitMQ consumers this service owns. Each consumer creates an
 * in-app notification (respecting the recipient's category preference) and the
 * email-dispatch consumer sends transactional mail.
 */
export async function registerConsumers(): Promise<void> {
  // 1) connection.requested → CONNECTION_REQUEST
  await registerConsumer<ConnectionRequestedEvent>(
    {
      exchange: EXCHANGES.CONNECTION_EVENTS,
      queue: QUEUES.NOTIFY_CONNECTION_REQUEST,
      routingKeys: [ROUTING_KEYS.CONNECTION_REQUESTED],
      dlx: DLX.NOTIFICATION,
      dlq: QUEUES.DLQ_NOTIFICATION,
    },
    async (envelope) => {
      const { connectionId, requesterId, addresseeId } = envelope.data;
      if (await preferenceService.allowsInApp(addresseeId, 'connections')) {
        await notificationService.create({
          recipientId: addresseeId,
          actorId: requesterId,
          type: 'CONNECTION_REQUEST',
          entityType: 'connection',
          entityId: connectionId,
          message: 'You have a new connection request',
        });
      }
      logger.info({ connectionId }, 'handled connection.requested');
    },
  );

  // 2) connection.accepted → CONNECTION_ACCEPTED
  await registerConsumer<ConnectionAcceptedEvent>(
    {
      exchange: EXCHANGES.CONNECTION_EVENTS,
      queue: QUEUES.NOTIFY_CONNECTION_ACCEPTED,
      routingKeys: [ROUTING_KEYS.CONNECTION_ACCEPTED],
      dlx: DLX.NOTIFICATION,
      dlq: QUEUES.DLQ_NOTIFICATION,
    },
    async (envelope) => {
      const { connectionId, requesterId, addresseeId } = envelope.data;
      if (await preferenceService.allowsInApp(requesterId, 'connections')) {
        await notificationService.create({
          recipientId: requesterId,
          actorId: addresseeId,
          type: 'CONNECTION_ACCEPTED',
          entityType: 'connection',
          entityId: connectionId,
          message: 'accepted your connection request',
        });
      }
      logger.info({ connectionId }, 'handled connection.accepted');
    },
  );

  // 3) post.reacted → POST_LIKE
  await registerConsumer<PostReactedEvent>(
    {
      exchange: EXCHANGES.POST_EVENTS,
      queue: QUEUES.NOTIFY_POST_REACTION,
      routingKeys: [ROUTING_KEYS.POST_REACTED],
      dlx: DLX.NOTIFICATION,
      dlq: QUEUES.DLQ_NOTIFICATION,
    },
    async (envelope) => {
      const { postId, authorId, userId, reactionType } = envelope.data;
      if (userId !== authorId && (await preferenceService.allowsInApp(authorId, 'posts'))) {
        await notificationService.create({
          recipientId: authorId,
          actorId: userId,
          type: 'POST_LIKE',
          entityType: 'post',
          entityId: postId,
          message: 'reacted to your post',
          metadata: { reactionType },
        });
      }
      logger.info({ postId }, 'handled post.reacted');
    },
  );

  // 4) post.commented → POST_COMMENT
  await registerConsumer<PostCommentedEvent>(
    {
      exchange: EXCHANGES.POST_EVENTS,
      queue: QUEUES.NOTIFY_COMMENT,
      routingKeys: [ROUTING_KEYS.POST_COMMENTED],
      dlx: DLX.NOTIFICATION,
      dlq: QUEUES.DLQ_NOTIFICATION,
    },
    async (envelope) => {
      const { postId, authorId, commentId, userId } = envelope.data;
      if (userId !== authorId && (await preferenceService.allowsInApp(authorId, 'posts'))) {
        await notificationService.create({
          recipientId: authorId,
          actorId: userId,
          type: 'POST_COMMENT',
          entityType: 'post',
          entityId: postId,
          message: 'commented on your post',
          metadata: { commentId },
        });
      }
      logger.info({ postId, commentId }, 'handled post.commented');
    },
  );

  // 5) message.sent → MESSAGE_RECEIVED (one notification per recipient)
  await registerConsumer<MessageSentEvent>(
    {
      exchange: EXCHANGES.NOTIFICATION,
      queue: QUEUES.NOTIFY_MESSAGE,
      routingKeys: [ROUTING_KEYS.MESSAGE_SENT],
      dlx: DLX.NOTIFICATION,
      dlq: QUEUES.DLQ_NOTIFICATION,
    },
    async (envelope) => {
      const { conversationId, messageId, senderId, recipientIds, preview } = envelope.data;
      const recipients = (recipientIds ?? []).filter((id) => id !== senderId);
      for (const recipientId of recipients) {
        if (await preferenceService.allowsInApp(recipientId, 'messages')) {
          await notificationService.create({
            recipientId,
            actorId: senderId,
            type: 'MESSAGE_RECEIVED',
            entityType: 'conversation',
            entityId: conversationId,
            message: 'sent you a message',
            metadata: { messageId, preview: preview ?? null },
          });
        }
      }
      logger.info({ conversationId, messageId }, 'handled message.sent');
    },
  );

  // 6) job.applied → JOB_RECOMMENDATION (closest available type)
  await registerConsumer<JobAppliedEvent>(
    {
      exchange: EXCHANGES.JOB_EVENTS,
      queue: QUEUES.NOTIFY_JOB_APPLICATION,
      routingKeys: [ROUTING_KEYS.JOB_APPLIED],
      dlx: DLX.NOTIFICATION,
      dlq: QUEUES.DLQ_NOTIFICATION,
    },
    async (envelope) => {
      const { jobId, posterId, applicantId, applicationId } = envelope.data;
      if (await preferenceService.allowsInApp(posterId, 'jobs')) {
        await notificationService.create({
          recipientId: posterId,
          actorId: applicantId,
          type: 'JOB_RECOMMENDATION',
          entityType: 'job',
          entityId: jobId,
          message: 'applied to your job posting',
          metadata: { applicationId },
        });
      }
      logger.info({ jobId, applicationId }, 'handled job.applied');
    },
  );

  // 7) email → transactional email dispatch
  await registerConsumer<EmailDispatchEvent>(
    {
      exchange: EXCHANGES.NOTIFICATION,
      queue: QUEUES.EMAIL_DISPATCH,
      routingKeys: [ROUTING_KEYS.NOTIFY_EMAIL],
      dlx: DLX.NOTIFICATION,
      dlq: QUEUES.DLQ_NOTIFICATION,
    },
    async (envelope) => {
      const { to, subject, html, text } = envelope.data;
      await emailService.send({ to, subject, html, text });
      logger.info({ to, subject }, 'handled email dispatch');
    },
  );
}
