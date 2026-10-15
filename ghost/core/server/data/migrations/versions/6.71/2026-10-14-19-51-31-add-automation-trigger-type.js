const logging = require('@tryghost/logging');
const {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createDropNullableMigration,
  createNonTransactionalMigration,
} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration('automations', 'trigger_type', {
    type: 'string',
    maxlength: 50,
    nullable: true,
    validations: { isIn: [['member_sign_up']] },
  }),

  createNonTransactionalMigration(
    async function up(knex) {
      const updatedRows = await knex('automations')
        .whereNull('trigger_type')
        .update({ trigger_type: 'member_sign_up' });
      logging.info(`Set trigger type for ${updatedRows} automations`);
    },
    async function down() {
      logging.info('Keeping automation trigger types until column rollback');
    },
  ),

  createDropNullableMigration('automations', 'trigger_type'),
);
