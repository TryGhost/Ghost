const ObjectId = require('bson-objectid');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const { createTransactionalMigration } = require('../../utils');

module.exports = createTransactionalMigration(
  async function up(knex) {
    await knex('automation_trigger_rules').del();

    const automations = await knex('automations').select('id', 'trigger_tier_scope', 'created_at');

    const rules = [];
    // eslint-disable-next-line no-restricted-syntax -- Sites have at most 50 automations.
    for (const automation of automations) {
      const base = { automation_id: automation.id, created_at: automation.created_at };
      switch (automation.trigger_tier_scope) {
        case 'free':
          rules.push({
            ...base,
            id: ObjectId().toHexString(),
            trigger_type: 'free_signup',
            scope: null,
            product_id: null,
          });
          break;
        case 'all_paid':
          rules.push({
            ...base,
            id: ObjectId().toHexString(),
            trigger_type: 'paid_subscription_started',
            scope: 'any_paid_tier',
            product_id: null,
          });
          break;
        case 'selected_paid': {
          const tiers = await knex('automation_trigger_tiers')
            .where('automation_id', automation.id)
            .pluck('product_id');
          rules.push(
            ...tiers.map((productId) => ({
              ...base,
              id: ObjectId().toHexString(),
              trigger_type: 'paid_subscription_started',
              scope: 'specific_paid_tier',
              product_id: productId,
            })),
          );
          break;
        }
        case null:
          // This is a welcome email automation or invalid automation. Handle it by doing nothing.
          break;
        default:
          throw new errors.InternalServerError({
            message: `Unexpected trigger_tier_scope for automation ${automation.id}: ${automation.trigger_tier_scope}`,
          });
      }
    }

    if (rules.length > 0) {
      await knex('automation_trigger_rules').insert(rules);
    }

    logging.info(`Backfilled ${rules.length} automation trigger rules`);
  },

  async function down() {
    logging.info('Keeping automation trigger rules until table rollback');
  },
);
