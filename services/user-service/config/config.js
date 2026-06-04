/**
 * sequelize-cli datasource config. Reads DATABASE_URL from the environment so
 * migrations target the same database the service uses at runtime.
 */
require('dotenv').config();

const common = {
  dialect: 'postgres',
  use_env_variable: 'DATABASE_URL',
  logging: false,
};

module.exports = {
  development: common,
  test: common,
  production: {
    ...common,
    dialectOptions:
      process.env.DB_SSL === 'true'
        ? { ssl: { require: true, rejectUnauthorized: process.env.DB_SSL_NO_VERIFY !== 'true' } }
        : {},
  },
};
