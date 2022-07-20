const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Setting "mrr" to 0 for all canceled subscriptions in "members_stripe_customers_subscriptions"');

        await knex('members_stripe_customers_subscriptions')
            .update('mrr', 0)
            .where('cancel_at_period_end', true);
    },
    async function down(knex) {
        logging.info('Setting "mrr" for all canceled and not yet expired subscriptions in "members_stripe_customers_subscriptions"');

        await knex('members_stripe_customers_subscriptions')
            .update('mrr', knex.raw(`
                CASE WHEN plan_interval = 'year' THEN
                    FLOOR(plan_amount / 12)
                WHEN plan_interval = 'week' THEN
                    plan_amount * 4
                WHEN plan_interval = 'day' THEN
                    plan_amount * 30
                ELSE 
                    plan_amount
                END
            `))
            .where('cancel_at_period_end', true)
            .whereNotIn('status', ['trialing', 'incomplete', 'incomplete_expired', 'canceled']);
    }
);
