const logging = require('@tryghost/logging');
const {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createNonTransactionalMigration,
} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration('automations', 'description', {
    type: 'string',
    maxlength: 2000,
    nullable: false,
    defaultTo: '',
  }),

  createNonTransactionalMigration(
    async function up(knex) {
      const freeMembersUpdated = await knex('automations')
        .where('slug', 'member-welcome-email-free')
        .update({ description: 'Welcome new free members after they sign up.' });
      const paidMembersUpdated = await knex('automations')
        .where('slug', 'member-welcome-email-paid')
        .update({ description: 'Welcome new paid members after they start their subscription.' });
      logging.info(`Set descriptions for ${freeMembersUpdated + paidMembersUpdated} automations`);
    },
    async function down() {
      logging.info('Keeping automation descriptions');
    },
  ),
);
