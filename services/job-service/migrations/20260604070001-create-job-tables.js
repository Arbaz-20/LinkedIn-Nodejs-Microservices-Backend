'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── companies ─────────────────────────────────────────
    await queryInterface.createTable('companies', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      logo_url: { type: Sequelize.STRING, allowNull: true },
      banner_url: { type: Sequelize.STRING, allowNull: true },
      website: { type: Sequelize.STRING, allowNull: true },
      industry: { type: Sequelize.STRING, allowNull: true },
      size: { type: Sequelize.STRING, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      location: { type: Sequelize.STRING, allowNull: true },
      founded_year: { type: Sequelize.INTEGER, allowNull: true },
      admin_ids: { type: Sequelize.ARRAY(Sequelize.UUID), allowNull: false, defaultValue: [] },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('companies', ['slug'], { unique: true, name: 'companies_slug_uk' });

    // ─── jobs ──────────────────────────────────────────────
    await queryInterface.createTable('jobs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      poster_id: { type: Sequelize.UUID, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      location: { type: Sequelize.STRING, allowNull: true },
      location_type: {
        type: Sequelize.ENUM('ONSITE', 'REMOTE', 'HYBRID'),
        allowNull: false,
        defaultValue: 'ONSITE',
      },
      employment_type: {
        type: Sequelize.ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'),
        allowNull: false,
      },
      experience_level: {
        type: Sequelize.ENUM('ENTRY', 'ASSOCIATE', 'MID_SENIOR', 'DIRECTOR', 'EXECUTIVE'),
        allowNull: false,
      },
      salary_min: { type: Sequelize.INTEGER, allowNull: true },
      salary_max: { type: Sequelize.INTEGER, allowNull: true },
      salary_currency: { type: Sequelize.STRING, allowNull: true, defaultValue: 'USD' },
      skills: { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: false, defaultValue: [] },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      applicants_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('jobs', ['company_id'], { name: 'jobs_company_id_idx' });
    await queryInterface.addIndex('jobs', ['is_active', 'created_at'], { name: 'jobs_active_created_idx' });

    // ─── applications ──────────────────────────────────────
    await queryInterface.createTable('applications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      job_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'jobs', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      applicant_id: { type: Sequelize.UUID, allowNull: false },
      resume_url: { type: Sequelize.STRING, allowNull: true },
      cover_letter: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('SUBMITTED', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED', 'WITHDRAWN'),
        allowNull: false,
        defaultValue: 'SUBMITTED',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addConstraint('applications', {
      fields: ['job_id', 'applicant_id'],
      type: 'unique',
      name: 'applications_job_applicant_uk',
    });
    await queryInterface.addIndex('applications', ['applicant_id'], { name: 'applications_applicant_id_idx' });

    // ─── saved_jobs ────────────────────────────────────────
    await queryInterface.createTable('saved_jobs', {
      user_id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      job_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'jobs', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saved_jobs');
    await queryInterface.dropTable('applications');
    await queryInterface.dropTable('jobs');
    await queryInterface.dropTable('companies');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jobs_location_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jobs_employment_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jobs_experience_level";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_applications_status";');
  },
};
