'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── profiles ──────────────────────────────────────────
    await queryInterface.createTable('profiles', {
      id: { type: Sequelize.UUID, primaryKey: true }, // mirrors auth user id
      first_name: { type: Sequelize.STRING, allowNull: false },
      last_name: { type: Sequelize.STRING, allowNull: false },
      headline: { type: Sequelize.STRING, allowNull: true },
      summary: { type: Sequelize.TEXT, allowNull: true },
      avatar_url: { type: Sequelize.STRING, allowNull: true },
      banner_url: { type: Sequelize.STRING, allowNull: true },
      location: { type: Sequelize.STRING, allowNull: true },
      website: { type: Sequelize.STRING, allowNull: true },
      industry: { type: Sequelize.STRING, allowNull: true },
      is_open_to_work: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      profile_views: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // ─── experiences ───────────────────────────────────────
    await queryInterface.createTable('experiences', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'profiles', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      title: { type: Sequelize.STRING, allowNull: false },
      company: { type: Sequelize.STRING, allowNull: false },
      company_logo: { type: Sequelize.STRING, allowNull: true },
      location: { type: Sequelize.STRING, allowNull: true },
      start_date: { type: Sequelize.DATE, allowNull: false },
      end_date: { type: Sequelize.DATE, allowNull: true },
      is_current: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('experiences', ['profile_id'], { name: 'experiences_profile_id_idx' });

    // ─── educations ────────────────────────────────────────
    await queryInterface.createTable('educations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'profiles', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      school: { type: Sequelize.STRING, allowNull: false },
      degree: { type: Sequelize.STRING, allowNull: true },
      field_of_study: { type: Sequelize.STRING, allowNull: true },
      start_year: { type: Sequelize.INTEGER, allowNull: false },
      end_year: { type: Sequelize.INTEGER, allowNull: true },
      grade: { type: Sequelize.STRING, allowNull: true },
      activities: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('educations', ['profile_id'], { name: 'educations_profile_id_idx' });

    // ─── skills ────────────────────────────────────────────
    await queryInterface.createTable('skills', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },
      category: { type: Sequelize.STRING, allowNull: true },
    });

    // ─── profile_skills (join) ─────────────────────────────
    await queryInterface.createTable('profile_skills', {
      profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'profiles', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      skill_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'skills', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      endorsements: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });

    // ─── certifications ────────────────────────────────────
    await queryInterface.createTable('certifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'profiles', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: { type: Sequelize.STRING, allowNull: false },
      issuing_org: { type: Sequelize.STRING, allowNull: false },
      issue_date: { type: Sequelize.DATE, allowNull: false },
      expiration_date: { type: Sequelize.DATE, allowNull: true },
      credential_id: { type: Sequelize.STRING, allowNull: true },
      credential_url: { type: Sequelize.STRING, allowNull: true },
    });
    await queryInterface.addIndex('certifications', ['profile_id'], { name: 'certifications_profile_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('certifications');
    await queryInterface.dropTable('profile_skills');
    await queryInterface.dropTable('skills');
    await queryInterface.dropTable('educations');
    await queryInterface.dropTable('experiences');
    await queryInterface.dropTable('profiles');
  },
};
