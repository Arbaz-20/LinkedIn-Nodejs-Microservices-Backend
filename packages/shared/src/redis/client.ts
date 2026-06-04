import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../logger';

let client: Redis | null = null;

/**
 * Lazily create and return a singleton ioredis client. The URL is read from
 * REDIS_URL on first call; subsequent calls return the same connection.
 */
export function getRedis(url = process.env.REDIS_URL, opts: RedisOptions = {}): Redis {
  if (client) return client;
  if (!url) throw new Error('REDIS_URL is not set');

  client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
    ...opts,
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', (err) => logger.error({ err }, 'Redis error'));
  client.on('close', () => logger.warn('Redis connection closed'));

  return client;
}

/** Disconnect the singleton (used on graceful shutdown). */
export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

export type { Redis };
