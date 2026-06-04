import { publishEvent, EXCHANGES, ROUTING_KEYS } from '@linkedin-clone/shared';
import { config } from '../config';

export interface ConnectionRequestedEvent {
  connectionId: string;
  requesterId: string;
  addresseeId: string;
}

export interface ConnectionAcceptedEvent {
  connectionId: string;
  requesterId: string;
  addresseeId: string;
}

class ConnectionEventPublisher {
  /** notify.connection.request consumer + search.index.user listen for this. */
  public publishRequested = async (
    data: ConnectionRequestedEvent,
    correlationId?: string,
  ): Promise<void> => {
    await publishEvent(
      EXCHANGES.CONNECTION_EVENTS,
      ROUTING_KEYS.CONNECTION_REQUESTED,
      data,
      config.SERVICE_NAME,
      { correlationId },
    );
  };

  /** notify.connection.accepted consumer listens for this. */
  public publishAccepted = async (
    data: ConnectionAcceptedEvent,
    correlationId?: string,
  ): Promise<void> => {
    await publishEvent(
      EXCHANGES.CONNECTION_EVENTS,
      ROUTING_KEYS.CONNECTION_ACCEPTED,
      data,
      config.SERVICE_NAME,
      { correlationId },
    );
  };
}

export const connectionEventPublisher = new ConnectionEventPublisher();
