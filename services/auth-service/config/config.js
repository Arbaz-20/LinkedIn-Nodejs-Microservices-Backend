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
    // Enable TLS with certificate verification when DB_SSL=true. Only relax
    // verification if you explicitly opt in (e.g. a managed PG self-signed CA)
    // via DB_SSL_NO_VERIFY=true — prefer adding the provider CA to the trust store.
    dialectOptions:
      process.env.DB_SSL === 'true'
        ? { ssl: { require: true, rejectUnauthorized: process.env.DB_SSL_NO_VERIFY !== 'true' } }
        : {},
  },
};
