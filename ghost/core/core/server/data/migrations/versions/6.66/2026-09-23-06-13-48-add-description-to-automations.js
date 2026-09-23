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
      const updatedRows = await knex('automations')
        .where('description', '')
        .update({
          description: knex.raw(`CASE slug
          WHEN 'member-welcome-email-free' THEN 'Welcome new free members after they sign up.'
          WHEN 'member-welcome-email-paid' THEN 'Welcome new paid members after they start their subscription.'
          ELSE '' END`),
        });
      logging.info(`Set descriptions for ${updatedRows} automations`);
    },
    async function down() {
      logging.info('Keeping automation descriptions until column rollback');
    },
  ),
);
