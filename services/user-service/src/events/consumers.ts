import { registerConsumer, EXCHANGES, ROUTING_KEYS, QUEUES, DLX, createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { profileService } from '../services/profile.service';

const logger = createLogger(config.SERVICE_NAME);

/** Payload published by auth-service on account creation. */
interface UserRegisteredEvent {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Register all RabbitMQ consumers this service owns. Currently: create a profile
 * whenever auth-service emits user.registered.
 */
export async function registerConsumers(): Promise<void> {
  await registerConsumer<UserRegisteredEvent>(
    {
      exchange: EXCHANGES.USER_EVENTS,
      queue: QUEUES.PROFILE_CREATE_ON_REGISTER,
      routingKeys: [ROUTING_KEYS.USER_REGISTERED],
      dlx: DLX.USER,
      dlq: QUEUES.DLQ_USER,
    },
    async (envelope) => {
      const { userId, firstName, lastName } = envelope.data;
      await profileService.createFromRegistration({ userId, firstName, lastName });
      logger.info({ userId }, 'handled user.registered');
    },
  );
}
