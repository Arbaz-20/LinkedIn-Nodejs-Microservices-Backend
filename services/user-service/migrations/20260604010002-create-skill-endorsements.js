'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('skill_endorsements', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      endorser_id: { type: Sequelize.UUID, allowNull: false },
      profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'profiles', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      skill_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'skills', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // One endorsement per (endorser, profile, skill).
    await queryInterface.addConstraint('skill_endorsements', {
      fields: ['endorser_id', 'profile_id', 'skill_id'],
      type: 'unique',
      name: 'skill_endorsements_endorser_profile_skill_uk',
    });
    await queryInterface.addIndex('skill_endorsements', ['profile_id', 'skill_id'], {
      name: 'skill_endorsements_profile_skill_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('skill_endorsements');
  },
};
