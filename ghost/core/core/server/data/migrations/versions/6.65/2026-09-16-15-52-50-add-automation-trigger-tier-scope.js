const logging = require('@tryghost/logging');
const {
  addTable,
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createDropNullableMigration,
  createNonTransactionalMigration,
} = require('../../utils');

/**
 * This migration:
 *
 * - Creates `automations.trigger_tier_scope` column with backfill
 * - Creates the `automation_trigger_tiers` table
 *
 * Databases should either have no automations, or exactly two.
 * That makes this migration simpler.
 */
module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration('automations', 'trigger_tier_scope', {
    type: 'string',
    maxlength: 50,
    // This will become required (non-nullable) once we backfill the data.
    nullable: true,
    validations: { isIn: [['free', 'all_paid', 'selected_paid']] },
  }),

  createNonTransactionalMigration(
    async function up(knex) {
      const updatedRows = await knex('automations').update({
        trigger_tier_scope: knex.raw(
          "CASE slug WHEN 'member-welcome-email-free' THEN 'free' WHEN 'member-welcome-email-paid' THEN 'all_paid' END",
        ),
      });
      logging.info(`Set trigger tier scope for ${updatedRows} automations`);
    },
    async function down() {
      logging.info('Keeping automation trigger tier scopes until column rollback');
    },
  ),

  createDropNullableMigration('automations', 'trigger_tier_scope'),

  addTable('automation_trigger_tiers', {
    automation_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'automations.id',
    },
    product_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'products.id',
    },
    '@@UNIQUE_CONSTRAINTS@@': [['automation_id', 'product_id']],
  }),
);
