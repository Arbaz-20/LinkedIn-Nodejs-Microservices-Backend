import { publishEvent, EXCHANGES, ROUTING_KEYS } from '@linkedin-clone/shared';
import { config } from '../config';

export interface PostCreatedEvent {
  postId: string;
  authorId: string;
  content: string;
  hashtags: string[];
}

export interface PostDeletedEvent {
  postId: string;
  authorId: string;
}

export interface PostReactedEvent {
  postId: string;
  authorId: string;
  actorId: string;
  type: string;
}

export interface PostCommentedEvent {
  postId: string;
  authorId: string;
  actorId: string;
  commentId: string;
}

class PostEventPublisher {
  /** search.index.post consumer listens for this. */
  public publishCreated = async (data: PostCreatedEvent, correlationId?: string): Promise<void> => {
    await publishEvent(EXCHANGES.POST_EVENTS, ROUTING_KEYS.POST_CREATED, data, config.SERVICE_NAME, { correlationId });
  };

  public publishDeleted = async (data: PostDeletedEvent, correlationId?: string): Promise<void> => {
    await publishEvent(EXCHANGES.POST_EVENTS, ROUTING_KEYS.POST_DELETED, data, config.SERVICE_NAME, { correlationId });
  };

  /** notify.post.reaction consumer listens for this. */
  public publishReacted = async (data: PostReactedEvent, correlationId?: string): Promise<void> => {
    await publishEvent(EXCHANGES.POST_EVENTS, ROUTING_KEYS.POST_REACTED, data, config.SERVICE_NAME, { correlationId });
  };

  /** notify.comment consumer listens for this. */
  public publishCommented = async (data: PostCommentedEvent, correlationId?: string): Promise<void> => {
    await publishEvent(EXCHANGES.POST_EVENTS, ROUTING_KEYS.POST_COMMENTED, data, config.SERVICE_NAME, { correlationId });
  };
}

export const postEventPublisher = new PostEventPublisher();
