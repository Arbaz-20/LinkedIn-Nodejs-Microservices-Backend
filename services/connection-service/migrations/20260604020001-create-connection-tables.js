'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── connections ───────────────────────────────────────
    await queryInterface.createTable('connections', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      requester_id: { type: Sequelize.UUID, allowNull: false },
      addressee_id: { type: Sequelize.UUID, allowNull: false },
      status: {
        type: Sequelize.ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      note: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addConstraint('connections', {
      fields: ['requester_id', 'addressee_id'],
      type: 'unique',
      name: 'connections_requester_addressee_uk',
    });
    await queryInterface.addIndex('connections', ['addressee_id', 'status'], {
      name: 'connections_addressee_status_idx',
    });
    await queryInterface.addIndex('connections', ['requester_id', 'status'], {
      name: 'connections_requester_status_idx',
    });

    // ─── follows ───────────────────────────────────────────
    await queryInterface.createTable('follows', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      follower_id: { type: Sequelize.UUID, allowNull: false },
      following_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addConstraint('follows', {
      fields: ['follower_id', 'following_id'],
      type: 'unique',
      name: 'follows_follower_following_uk',
    });
    await queryInterface.addIndex('follows', ['following_id'], { name: 'follows_following_id_idx' });

    // ─── blocks ────────────────────────────────────────────
    await queryInterface.createTable('blocks', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      blocker_id: { type: Sequelize.UUID, allowNull: false },
      blocked_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addConstraint('blocks', {
      fields: ['blocker_id', 'blocked_id'],
      type: 'unique',
      name: 'blocks_blocker_blocked_uk',
    });
    await queryInterface.addIndex('blocks', ['blocked_id'], { name: 'blocks_blocked_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('blocks');
    await queryInterface.dropTable('follows');
    await queryInterface.dropTable('connections');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_connections_status";');
  },
};
