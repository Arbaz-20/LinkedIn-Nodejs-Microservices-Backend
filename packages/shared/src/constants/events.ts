/**
 * Event routing keys (topic exchanges) and direct routing keys.
 * Publishers emit with these keys; consumers bind queues to patterns of them.
 */

export const ROUTING_KEYS = {
  // connection.events
  CONNECTION_REQUESTED: 'connection.requested',
  CONNECTION_ACCEPTED: 'connection.accepted',
  CONNECTION_REJECTED: 'connection.rejected',
  USER_FOLLOWED: 'connection.followed',

  // post.events
  POST_CREATED: 'post.created',
  POST_UPDATED: 'post.updated',
  POST_DELETED: 'post.deleted',
  POST_REACTED: 'post.reacted',
  POST_COMMENTED: 'post.commented',

  // user.events
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',

  // job.events
  JOB_CREATED: 'job.created',
  JOB_APPLIED: 'job.applied',

  // messaging (published to notification.direct)
  MESSAGE_SENT: 'message.sent',

  // notification.direct routing keys
  NOTIFY_EMAIL: 'email',
  NOTIFY_PUSH: 'push',

  // media.processing routing keys
  MEDIA_RESIZE: 'resize',
  MEDIA_THUMBNAIL: 'thumbnail',
} as const;

export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

/**
 * Canonical envelope shape for every event published on the bus.
 * `data` is event-specific; consumers narrow it by `type`.
 */
export interface EventEnvelope<T = unknown> {
  /** Routing key / event type, e.g. "post.created" */
  type: RoutingKey;
  /** Service that emitted the event */
  source: string;
  /** ISO timestamp */
  timestamp: string;
  /** Correlation id for tracing across services */
  correlationId?: string;
  /** Event payload */
  data: T;
}
