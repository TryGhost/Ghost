const logging = require('@tryghost/logging');
const {
  addTable,
  combineNonTransactionalMigrations,
  createAddColumnMigration,
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
    nullable: true,
    validations: { isIn: [['free', 'all_paid', 'selected_paid']] },
  }),

  createNonTransactionalMigration(
    async function up(knex) {
      const freeUpdatedRows = await knex('automations')
        .where({ slug: 'member-welcome-email-free' })
        .update('trigger_tier_scope', 'free');
      const paidUpdatedRows = await knex('automations')
        .where({ slug: 'member-welcome-email-paid' })
        .update('trigger_tier_scope', 'all_paid');
      logging.info(`Set trigger tier scope for ${freeUpdatedRows + paidUpdatedRows} automations`);
    },
    async function down() {
      logging.info('Keeping automation trigger tier scopes until column rollback');
    },
  ),

  addTable('automation_trigger_tiers', {
    automation_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'automations.id',
      cascadeDelete: true,
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
