'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── media ─────────────────────────────────────────────
    await queryInterface.createTable('media', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      uploader_id: { type: Sequelize.UUID, allowNull: false },
      file_name: { type: Sequelize.STRING, allowNull: false },
      mime_type: { type: Sequelize.STRING, allowNull: false },
      size: { type: Sequelize.INTEGER, allowNull: false },
      url: { type: Sequelize.STRING, allowNull: false },
      thumbnail_url: { type: Sequelize.STRING, allowNull: true },
      bucket: { type: Sequelize.STRING, allowNull: false, defaultValue: 'uploads' },
      key: { type: Sequelize.STRING, allowNull: false },
      width: { type: Sequelize.INTEGER, allowNull: true },
      height: { type: Sequelize.INTEGER, allowNull: true },
      status: {
        type: Sequelize.ENUM('PROCESSING', 'READY', 'FAILED'),
        allowNull: false,
        defaultValue: 'PROCESSING',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addConstraint('media', {
      fields: ['key'],
      type: 'unique',
      name: 'media_key_uk',
    });
    await queryInterface.addIndex('media', ['uploader_id'], { name: 'media_uploader_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('media');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_media_status";');
  },
};
