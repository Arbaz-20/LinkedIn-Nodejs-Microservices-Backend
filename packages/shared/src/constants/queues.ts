/**
 * RabbitMQ exchange and queue topology.
 * Exchanges are declared by publishers; queues are declared + bound by consumers.
 */

export const EXCHANGES = {
  USER_EVENTS: 'user.events', // topic
  POST_EVENTS: 'post.events', // topic
  CONNECTION_EVENTS: 'connection.events', // topic
  JOB_EVENTS: 'job.events', // topic
  NOTIFICATION: 'notification.direct', // direct
  MEDIA_PROCESSING: 'media.processing', // direct
} as const;

export type ExchangeName = (typeof EXCHANGES)[keyof typeof EXCHANGES];

/**
 * Exchange types — used when asserting an exchange.
 */
export const EXCHANGE_TYPES: Record<ExchangeName, 'topic' | 'direct'> = {
  [EXCHANGES.USER_EVENTS]: 'topic',
  [EXCHANGES.POST_EVENTS]: 'topic',
  [EXCHANGES.CONNECTION_EVENTS]: 'topic',
  [EXCHANGES.JOB_EVENTS]: 'topic',
  [EXCHANGES.NOTIFICATION]: 'direct',
  [EXCHANGES.MEDIA_PROCESSING]: 'direct',
};

export const QUEUES = {
  // notification-service consumers
  NOTIFY_CONNECTION_REQUEST: 'notify.connection.request',
  NOTIFY_CONNECTION_ACCEPTED: 'notify.connection.accepted',
  NOTIFY_POST_REACTION: 'notify.post.reaction',
  NOTIFY_COMMENT: 'notify.comment',
  NOTIFY_MESSAGE: 'notify.message',
  NOTIFY_JOB_APPLICATION: 'notify.job.application',

  // user-service consumers
  PROFILE_CREATE_ON_REGISTER: 'profile.create.on-register',

  // search-service consumers
  SEARCH_INDEX_USER: 'search.index.user',
  SEARCH_INDEX_POST: 'search.index.post',
  SEARCH_INDEX_JOB: 'search.index.job',

  // generic transactional email dispatch (notification-service)
  EMAIL_DISPATCH: 'email.dispatch',

  // media-service consumers
  MEDIA_RESIZE: 'media.resize',
  MEDIA_THUMBNAIL: 'media.thumbnail',

  // dead-letter queues
  DLQ_USER: 'dlq.user',
  DLQ_NOTIFICATION: 'dlq.notification',
  DLQ_SEARCH: 'dlq.search',
  DLQ_MEDIA: 'dlq.media',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * Dead-letter exchanges. Each domain has one DLX; failed messages route here
 * after exhausting retries.
 */
export const DLX = {
  USER: 'dlx.user',
  NOTIFICATION: 'dlx.notification',
  SEARCH: 'dlx.search',
  MEDIA: 'dlx.media',
} as const;

export type DlxName = (typeof DLX)[keyof typeof DLX];
