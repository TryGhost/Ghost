const ObjectID = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const {createIrreversibleMigration} = require('../../utils');

module.exports = createIrreversibleMigration(
    async function up(knex) {
        const subscriptions = await knex('members_stripe_customers_subscriptions')
            .join('members_stripe_customers', 'members_stripe_customers_subscriptions.customer_id', '=', 'members_stripe_customers.customer_id')
            .join('members', 'members_stripe_customers.member_id', '=', 'members.id')
            .where('cancel_at_period_end', true)
            .whereNotIn('status', ['trialing', 'canceled', 'incomplete', 'incomplete_expired'])
            .select(
                'members_stripe_customers_subscriptions.id',
                'members_stripe_customers_subscriptions.mrr',
                'members_stripe_customers_subscriptions.stripe_price_id',
                'members_stripe_customers_subscriptions.plan_currency',
                'members_stripe_customers.member_id'
            );

        const now = knex.raw('CURRENT_TIMESTAMP');

        if (subscriptions.length === 0) {
            logging.info('No canceled subscriptions found, skipping migration.');
            return;
        } else {
            logging.info(`Found ${subscriptions.length} canceled subscriptions, inserting MRR events.`);
        }

        const events = subscriptions.map((subscription) => {
            return {
                id: ObjectID().toHexString(),
                type: 'canceled',
                source: 'migration',
                created_at: now,
                from_plan: subscription.stripe_price_id,
                to_plan: subscription.stripe_price_id,
                subscription_id: subscription.id,
                member_id: subscription.member_id,
                currency: subscription.plan_currency,
                mrr_delta: -subscription.mrr
            };
        });

        await knex.batchInsert('members_paid_subscription_events', events);
    }
);
