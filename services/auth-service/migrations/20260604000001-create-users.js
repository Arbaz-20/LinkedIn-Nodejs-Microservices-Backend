'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING, allowNull: true },
      is_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      verify_token: { type: Sequelize.STRING, allowNull: true },
      reset_token: { type: Sequelize.STRING, allowNull: true },
      reset_expiry: { type: Sequelize.DATE, allowNull: true },
      role: {
        type: Sequelize.ENUM('USER', 'ADMIN', 'RECRUITER'),
        allowNull: false,
        defaultValue: 'USER',
      },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
    // Drop the enum type left behind by Postgres.
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
  },
};
