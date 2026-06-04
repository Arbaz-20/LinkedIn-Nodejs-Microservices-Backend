import { ConsumeMessage } from 'amqplib';
import { rabbit } from './connection';
import { EXCHANGE_TYPES, ExchangeName, DlxName } from '../constants/queues';
import { EventEnvelope } from '../constants/events';
import { logger } from '../logger';

export interface ConsumerConfig {
  /** Source exchange to bind to. */
  exchange: ExchangeName;
  /** Durable queue name for this consumer. */
  queue: string;
  /** One or more routing-key patterns to bind (e.g. "post.*", "connection.requested"). */
  routingKeys: string[];
  /** Dead-letter exchange + queue for poison messages. */
  dlx: DlxName;
  dlq: string;
  /** Max in-process retries before dead-lettering. Default 3. */
  maxRetries?: number;
  /** Backoff schedule in ms, indexed by attempt. Default [1000, 5000, 25000]. */
  backoff?: number[];
  /** Channel prefetch. Default 10. */
  prefetch?: number;
}

export type EventHandler<T = unknown> = (
  envelope: EventEnvelope<T>,
  raw: ConsumeMessage,
) => Promise<void>;

/**
 * Register a durable consumer with retry + dead-letter semantics.
 *
 * Topology asserted:
 *   - source exchange (topic/direct, durable)
 *   - dead-letter exchange (fanout, durable) + DLQ bound to it
 *   - main queue (durable) with x-dead-letter-exchange → DLX
 *   - main queue bound to source exchange for each routing key
 *
 * On handler failure the message is retried in-process with backoff; once
 * retries are exhausted it is rejected (no requeue) and the broker routes it to
 * the DLX → DLQ for later inspection.
 */
export async function registerConsumer<T = unknown>(
  config: ConsumerConfig,
  handler: EventHandler<T>,
): Promise<void> {
  const {
    exchange,
    queue,
    routingKeys,
    dlx,
    dlq,
    maxRetries = 3,
    backoff = [1000, 5000, 25000],
    prefetch = 10,
  } = config;

  const channel = await rabbit.createChannel(prefetch);

  // Source exchange
  await channel.assertExchange(exchange, EXCHANGE_TYPES[exchange], { durable: true });

  // Dead-letter exchange + queue
  await channel.assertExchange(dlx, 'fanout', { durable: true });
  await channel.assertQueue(dlq, { durable: true });
  await channel.bindQueue(dlq, dlx, '');

  // Main work queue, dead-lettering to the DLX
  await channel.assertQueue(queue, {
    durable: true,
    deadLetterExchange: dlx,
  });
  for (const key of routingKeys) {
    await channel.bindQueue(queue, exchange, key);
  }

  await channel.consume(queue, async (msg) => {
    if (!msg) return;

    let envelope: EventEnvelope<T>;
    try {
      envelope = JSON.parse(msg.content.toString()) as EventEnvelope<T>;
    } catch (err) {
      logger.error({ err, queue }, 'unparseable message — dead-lettering');
      channel.reject(msg, false);
      return;
    }

    let attempt = 0;
    for (;;) {
      try {
        await handler(envelope, msg);
        channel.ack(msg);
        return;
      } catch (err) {
        attempt += 1;
        if (attempt > maxRetries) {
          logger.error(
            { err, queue, type: envelope.type, attempts: attempt },
            'handler failed — dead-lettering message',
          );
          channel.reject(msg, false); // no requeue → routes to DLX
          return;
        }
        const delay = backoff[Math.min(attempt - 1, backoff.length - 1)];
        logger.warn(
          { err, queue, type: envelope.type, attempt },
          `handler error — retrying in ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  });

  logger.info({ queue, exchange, routingKeys }, 'consumer registered');
}
