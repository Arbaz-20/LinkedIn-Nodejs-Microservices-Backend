import { app } from './app';
import { config } from './config';
import { getRedis, closeRedis, createLogger } from '@linkedin-clone/shared';

const logger = createLogger(config.SERVICE_NAME);

async function bootstrap(): Promise<void> {
  // Warm the Redis connection used by the rate limiter.
  getRedis(config.REDIS_URL);

  const server = app.listen(config.PORT, () => {
    logger.info(`${config.SERVICE_NAME} listening on :${config.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down`);
    server.close();
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal(err, 'fatal startup error');
  process.exit(1);
});
