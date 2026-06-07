import { rabbit, createLogger } from '@linkedin-clone/shared';
import { app } from './app';
import { config } from './config';
import { esClient, ensureIndices } from './es/client';
import { registerConsumers } from './events/consumers';

const logger = createLogger(config.SERVICE_NAME);

async function bootstrap(): Promise<void> {
  await ensureIndices();
  await rabbit.connect(config.RABBITMQ_URL);
  await registerConsumers();
  logger.info('Elasticsearch indices ready, RabbitMQ connected, consumers registered');

  const server = app.listen(config.PORT, () => {
    logger.info(`${config.SERVICE_NAME} listening on :${config.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down`);
    server.close();
    await rabbit.close();
    await esClient.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal(err, 'fatal startup error');
  process.exit(1);
});
