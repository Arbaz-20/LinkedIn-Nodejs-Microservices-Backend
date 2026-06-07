'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── notifications ──────────────────────────────────────
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      recipient_id: { type: Sequelize.UUID, allowNull: false },
      actor_id: { type: Sequelize.UUID, allowNull: true },
      type: {
        type: Sequelize.ENUM(
          'CONNECTION_REQUEST',
          'CONNECTION_ACCEPTED',
          'POST_LIKE',
          'POST_COMMENT',
          'COMMENT_REPLY',
          'ENDORSEMENT',
          'PROFILE_VIEW',
          'JOB_RECOMMENDATION',
          'MESSAGE_RECEIVED',
          'MENTION',
        ),
        allowNull: false,
      },
      entity_type: { type: Sequelize.STRING, allowNull: true },
      entity_id: { type: Sequelize.STRING, allowNull: true },
      message: { type: Sequelize.STRING, allowNull: false },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: Sequelize.DATE, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('notifications', ['recipient_id', 'is_read', 'created_at'], {
      name: 'notifications_recipient_read_created_idx',
    });

    // ─── notification_preferences ───────────────────────────
    await queryInterface.createTable('notification_preferences', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      user_id: { type: Sequelize.UUID, allowNull: false },
      in_app: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      email: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      push: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      connections: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      messages: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      posts: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      jobs: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    });
    await queryInterface.addConstraint('notification_preferences', {
      fields: ['user_id'],
      type: 'unique',
      name: 'notification_preferences_user_id_uk',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_preferences');
    await queryInterface.dropTable('notifications');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_type";');
  },
};
