'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── conversations ─────────────────────────────────────
    await queryInterface.createTable('conversations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      is_group: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      group_name: { type: Sequelize.STRING, allowNull: true },
      group_avatar: { type: Sequelize.STRING, allowNull: true },
      last_message_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('conversations', [{ name: 'last_message_at', order: 'DESC' }], {
      name: 'conversations_last_message_at_idx',
    });

    // ─── participants ──────────────────────────────────────
    await queryInterface.createTable('participants', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      conversation_id: { type: Sequelize.UUID, allowNull: false },
      user_id: { type: Sequelize.UUID, allowNull: false },
      joined_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      last_read_at: { type: Sequelize.DATE, allowNull: true },
      is_muted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    });
    await queryInterface.addConstraint('participants', {
      fields: ['conversation_id', 'user_id'],
      type: 'unique',
      name: 'participants_conversation_user_uk',
    });
    await queryInterface.addIndex('participants', ['user_id'], { name: 'participants_user_id_idx' });

    // ─── messages ──────────────────────────────────────────
    await queryInterface.createTable('messages', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      conversation_id: { type: Sequelize.UUID, allowNull: false },
      sender_id: { type: Sequelize.UUID, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: true },
      media_url: { type: Sequelize.STRING, allowNull: true },
      message_type: {
        type: Sequelize.ENUM('TEXT', 'IMAGE', 'FILE', 'SYSTEM'),
        allowNull: false,
        defaultValue: 'TEXT',
      },
      is_edited: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('messages', ['conversation_id', { name: 'created_at', order: 'DESC' }], {
      name: 'messages_conversation_created_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('participants');
    await queryInterface.dropTable('conversations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_messages_message_type";');
  },
};
