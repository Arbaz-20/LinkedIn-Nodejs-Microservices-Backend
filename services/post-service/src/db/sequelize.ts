import { Sequelize } from 'sequelize';
import { config, isProd } from '../config';
import { createLogger } from '@linkedin-clone/shared';

const logger = createLogger(config.SERVICE_NAME);

export const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: 'postgres',
  logging: isProd ? false : (msg) => logger.debug(msg),
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: { underscored: true },
  dialectOptions:
    process.env.DB_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: process.env.DB_SSL_NO_VERIFY !== 'true' } }
      : {},
});

export async function assertDbConnection(): Promise<void> {
  await sequelize.authenticate();
  logger.info('Postgres connection established');
}
