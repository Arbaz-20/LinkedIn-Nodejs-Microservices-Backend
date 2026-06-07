import { publishEvent, EXCHANGES, ROUTING_KEYS } from '@linkedin-clone/shared';
import { config } from '../config';

export interface MessageSentEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  recipientIds: string[];
  preview: string;
}

class MessageEventPublisher {
  /** notification-service fans this out to the recipients as a new-message alert. */
  public publishSent = async (data: MessageSentEvent, correlationId?: string): Promise<void> => {
    await publishEvent(
      EXCHANGES.NOTIFICATION,
      ROUTING_KEYS.MESSAGE_SENT,
      data,
      config.SERVICE_NAME,
      { correlationId },
    );
  };
}

export const messageEventPublisher = new MessageEventPublisher();
