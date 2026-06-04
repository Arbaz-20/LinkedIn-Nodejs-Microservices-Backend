'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── posts ─────────────────────────────────────────────
    await queryInterface.createTable('posts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      author_id: { type: Sequelize.UUID, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      media_urls: { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: false, defaultValue: [] },
      post_type: {
        type: Sequelize.ENUM('POST', 'ARTICLE', 'POLL', 'SHARE', 'CELEBRATION'),
        allowNull: false,
        defaultValue: 'POST',
      },
      visibility: {
        type: Sequelize.ENUM('PUBLIC', 'CONNECTIONS', 'PRIVATE'),
        allowNull: false,
        defaultValue: 'PUBLIC',
      },
      is_edited: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      likes_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      comments_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      shares_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('posts', ['author_id', 'created_at'], { name: 'posts_author_created_idx' });
    await queryInterface.addIndex('posts', ['created_at'], { name: 'posts_created_idx' });

    // ─── comments ──────────────────────────────────────────
    await queryInterface.createTable('comments', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      author_id: { type: Sequelize.UUID, allowNull: false },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'comments', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      content: { type: Sequelize.TEXT, allowNull: false },
      likes_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('comments', ['post_id', 'created_at'], { name: 'comments_post_created_idx' });
    await queryInterface.addIndex('comments', ['parent_id'], { name: 'comments_parent_idx' });

    // ─── reactions ─────────────────────────────────────────
    await queryInterface.createTable('reactions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      user_id: { type: Sequelize.UUID, allowNull: false },
      type: {
        type: Sequelize.ENUM('LIKE', 'CELEBRATE', 'SUPPORT', 'LOVE', 'INSIGHTFUL', 'FUNNY'),
        allowNull: false,
        defaultValue: 'LIKE',
      },
    });
    await queryInterface.addConstraint('reactions', {
      fields: ['post_id', 'user_id'],
      type: 'unique',
      name: 'reactions_post_user_uk',
    });

    // ─── hashtags ──────────────────────────────────────────
    await queryInterface.createTable('hashtags', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },
    });

    // ─── post_hashtags (join) ──────────────────────────────
    await queryInterface.createTable('post_hashtags', {
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'posts', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      hashtag_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'hashtags', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('post_hashtags');
    await queryInterface.dropTable('hashtags');
    await queryInterface.dropTable('reactions');
    await queryInterface.dropTable('comments');
    await queryInterface.dropTable('posts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_posts_post_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_posts_visibility";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_reactions_type";');
  },
};
