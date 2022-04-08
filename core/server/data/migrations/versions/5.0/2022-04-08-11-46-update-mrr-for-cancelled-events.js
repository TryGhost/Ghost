const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const cancelledSubscriptions = await knex
            .select(
                'members_stripe_customers_subscriptions.id',
                'members_stripe_customers_subscriptions.plan_currency',
                'members_stripe_customers_subscriptions.plan_interval',
                'members_stripe_customers_subscriptions.plan_amount',
            )
            .from('members_stripe_customers_subscriptions')
            .join('members_stripe_customers', 'members_stripe_customers.customer_id', '=', 'members_stripe_customers_subscriptions.customer_id')
            .join('members', 'members_stripe_customers.member_id', '=', 'members.id')
            .where('members_stripe_customers_subscriptions.cancel_at_period_end', true)
            .whereNot('members_stripe_customers_subscriptions.status', 'canceled');

        if (cancelledSubscriptions.length === 0) {
            logging.info('No cancelled subscriptions - skipping migration');
            return;
        }

        logging.info(`Found ${cancelledSubscriptions.length} subscriptions to update events for`);
        for (const subscription of cancelledSubscriptions) {
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

            logging.info(`Updating cancelled events for ${subscription.id} to include mrr_delta`);
            await knex('members_paid_subscription_events').update({mrr_delta: mrrDelta}).where({
                type: 'cancelled',
                subscription_id: subscription.id
            });
            logging.info(`Updating reactivated events for ${subscription.id} to include mrr_delta`);
            await knex('members_paid_subscription_events').update({mrr_delta: -1 * mrrDelta}).where({
                type: 'reactivated',
                subscription_id: subscription.id
            });
        }
    },
    async function down(knex) {
        await knex('members_paid_subscription_events').update({mrr_delta: 0}).whereIn('type', ['cancelled', 'reactivated']);
    }
);
