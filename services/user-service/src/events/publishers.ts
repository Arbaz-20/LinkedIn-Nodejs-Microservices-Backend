import { publishEvent, EXCHANGES, ROUTING_KEYS } from '@linkedin-clone/shared';
import { config } from '../config';

/** Denormalized profile snapshot for search indexing / cross-service caches. */
export interface UserUpdatedEvent {
  userId: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  avatarUrl: string | null;
  location: string | null;
  industry: string | null;
}

class UserEventPublisher {
  public publishUserUpdated = async (
    data: UserUpdatedEvent,
    correlationId?: string,
  ): Promise<void> => {
    await publishEvent(
      EXCHANGES.USER_EVENTS,
      ROUTING_KEYS.USER_UPDATED,
      data,
      config.SERVICE_NAME,
      { correlationId },
    );
  };
}

export const userEventPublisher = new UserEventPublisher();
