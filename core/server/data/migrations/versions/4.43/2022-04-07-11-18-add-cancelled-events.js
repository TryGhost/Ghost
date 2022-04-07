const ObjectID = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const cancelledSubscriptions = await knex
            .select(
                'members.id',
                'members_stripe_customers_subscriptions.plan_currency',
                'members_stripe_customers_subscriptions.plan_amount',
                'members_stripe_customers_subscriptions.plan_interval',
                'members_stripe_customers_subscriptions.updated_at'
            )
            .from('members_stripe_customers_subscriptions')
            .join('members_stripe_customers', 'members_stripe_customers.customer_id', '=', 'members_stripe_customers_subscriptions.customer_id')
            .join('members', 'members_stripe_customers.member_id', '=', 'members.id')
            .where('members_stripe_customers_subscriptions.cancel_at_period_end', true)
            .whereNot('members_stripe_customers_subscriptions.status', 'canceled');

        const eventsToInsert = cancelledSubscriptions.map((subscription) => {
            let mrrDelta;
            if (subscription.plan_interval === 'year') {
                mrrDelta = -1 * Math.floor(subscription.plan_amount / 12);
            }
            if (subscription.plan_interval === 'month') {
                mrrDelta = -1 * subscription.plan_amount;
            }
            if (subscription.plan_interval === 'week') {
                mrrDelta = -1 * subscription.plan_amount * 4;
            }
            if (subscription.plan_interval === 'day') {
                mrrDelta = -1 * subscription.plan_amount * 30;
            }
            const event = {
                id: (new ObjectID()).toHexString(),
                type: 'cancelled',
                member_id: subscription.id,
                from_plan: null,
                to_plan: null,
                currency: subscription.plan_currency,
                source: 'migration',
                mrr_delta: mrrDelta,
                created_at: subscription.updated_at
            };

            return event;
        });

        await knex('members_paid_subscription_events').insert(eventsToInsert);
    },
    async function down(knex) {
        logging.info('Deleting all members_paid_subscription_events with a "type" of "cancelled"')
        await knex('members_paid_subscription_events').where('type', 'cancelled').del();
    }
);
