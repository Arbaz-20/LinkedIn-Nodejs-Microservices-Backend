import { publishEvent, EXCHANGES, ROUTING_KEYS } from '@linkedin-clone/shared';
import { config } from '../config';

/** Payload emitted when a new account is created. user-service creates the
 *  matching profile (id === userId); search-service indexes the user. */
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

class UserEventPublisher {
  public publishUserRegistered = async (
    data: UserRegisteredEvent,
    correlationId?: string,
  ): Promise<void> => {
    await publishEvent(
      EXCHANGES.USER_EVENTS,
      ROUTING_KEYS.USER_REGISTERED,
      data,
      config.SERVICE_NAME,
      { correlationId },
    );
  };
}

export const userEventPublisher = new UserEventPublisher();
