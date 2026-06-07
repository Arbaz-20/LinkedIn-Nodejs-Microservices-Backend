import { rabbit, getRedis, closeRedis, createLogger } from '@linkedin-clone/shared';
import { app } from './app';
import { config } from './config';
import { sequelize, assertDbConnection } from './db/sequelize';
// Import models for side-effect association wiring.
import './models';

const logger = createLogger(config.SERVICE_NAME);

async function bootstrap(): Promise<void> {
  await assertDbConnection();
  await rabbit.connect(config.RABBITMQ_URL);
  // job-service only publishes events; it has no consumers to register.
  if (config.REDIS_URL) getRedis(config.REDIS_URL);
  logger.info('RabbitMQ connected');

  const server = app.listen(config.PORT, () => {
    logger.info(`${config.SERVICE_NAME} listening on :${config.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down`);
    server.close();
    await rabbit.close();
    await closeRedis();
    await sequelize.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal(err, 'fatal startup error');
  process.exit(1);
});
