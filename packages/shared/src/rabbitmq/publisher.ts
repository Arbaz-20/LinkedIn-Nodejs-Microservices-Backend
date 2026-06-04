import { rabbit } from './connection';
import { EXCHANGES, EXCHANGE_TYPES, ExchangeName } from '../constants/queues';
import { EventEnvelope, RoutingKey } from '../constants/events';
import { logger } from '../logger';

const assertedExchanges = new Set<string>();

/** Assert an exchange once per process (idempotent on the broker, cached locally). */
async function ensureExchange(channel: ReturnType<typeof rabbit.getPublishChannel>, exchange: ExchangeName): Promise<void> {
  if (assertedExchanges.has(exchange)) return;
  await channel.assertExchange(exchange, EXCHANGE_TYPES[exchange], { durable: true });
  assertedExchanges.add(exchange);
}

export interface PublishOptions {
  /** Correlation id propagated into the envelope for tracing. */
  correlationId?: string;
  /** Number of publish attempts on transient failure. */
  retries?: number;
}

/**
 * Publish an event envelope to an exchange with a routing key. Uses a confirm
 * channel and waits for broker ack; retries on transient failures with backoff.
 */
export async function publishEvent<T>(
  exchange: ExchangeName,
  routingKey: RoutingKey,
  data: T,
  source: string,
  options: PublishOptions = {},
): Promise<void> {
  const retries = options.retries ?? 3;
  const envelope: EventEnvelope<T> = {
    type: routingKey,
    source,
    timestamp: new Date().toISOString(),
    correlationId: options.correlationId,
    data,
  };
  const payload = Buffer.from(JSON.stringify(envelope));

  let attempt = 0;
  // backoff schedule: 200ms, 1s, 5s
  const backoff = [200, 1000, 5000];

  for (;;) {
    try {
      const channel = rabbit.getPublishChannel();
      await ensureExchange(channel, exchange);
      await new Promise<void>((resolve, reject) => {
        channel.publish(
          exchange,
          routingKey,
          payload,
          { persistent: true, contentType: 'application/json', correlationId: options.correlationId },
          (err) => (err ? reject(err) : resolve()),
        );
      });
      logger.debug({ exchange, routingKey, source }, 'event published');
      return;
    } catch (err) {
      attempt += 1;
      if (attempt > retries) {
        logger.error({ err, exchange, routingKey }, 'event publish failed after retries');
        throw err;
      }
      const delay = backoff[Math.min(attempt - 1, backoff.length - 1)];
      logger.warn({ err, exchange, routingKey, attempt }, `publish retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/** Convenience map of exchanges for callers. */
export { EXCHANGES };
