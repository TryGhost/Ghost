const ObjectID = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        // eslint-disable-next-line no-restricted-syntax
        const canceledSubscriptions = await knex('members_stripe_customers_subscriptions')
            .select(
                'members_stripe_customers_subscriptions.id',
                'members_stripe_customers_subscriptions.updated_at',
                'members_stripe_customers_subscriptions.mrr',
                'members_stripe_customers_subscriptions.stripe_price_id',
                'members_stripe_customers_subscriptions.plan_currency',
                'members_stripe_customers.member_id'
            )
            .join('members_stripe_customers', 'members_stripe_customers_subscriptions.customer_id', '=', 'members_stripe_customers.customer_id')
            .join('members', 'members_stripe_customers.member_id', '=', 'members.id')
            .where('cancel_at_period_end', '=', true)
            .where('mrr', '!=', 0);

        if (canceledSubscriptions.length === 0) {
            logging.info('No canceled subscriptions found, skipping migration.');
            return;
        } else {
            logging.info(`Found ${canceledSubscriptions.length} canceled subscriptions, updating MRR events`);
        }

        const canceledEvents = await knex('members_paid_subscription_events')
            .select('*')
            .where('type', '=', 'canceled')
            .whereIn('subscription_id', canceledSubscriptions.map(x => x.id))
            .orderBy('created_at', 'desc');

        const toUpdate = [];
        const toInsert = [];

        // eslint-disable-next-line no-restricted-syntax
        for (const subscription of canceledSubscriptions) {
            const event = canceledEvents.find(e => e.subscription_id === subscription.id);
            if (event) {
                // if an event exists, update it
                // we always update the latest event for a subscription due to the orderBy DESC
                toUpdate.push({
                    ...event,
                    mrr_delta: -subscription.mrr
                });
            } else {
                toInsert.push({
                    id: ObjectID().toHexString(),
                    type: 'canceled',
                    source: 'migration',
                    created_at: subscription.updated_at,
                    from_plan: subscription.stripe_price_id,
                    to_plan: subscription.stripe_price_id,
                    subscription_id: subscription.id,
                    member_id: subscription.member_id,
                    currency: subscription.plan_currency,
                    mrr_delta: -subscription.mrr
                });
            }
        }

        logging.info(`Inserting ${toInsert.length} MRR events for canceled subscriptions`);
        await knex.batchInsert('members_paid_subscription_events', toInsert);

        logging.info(`Updating ${toUpdate.length} MRR events for canceled subscriptions`);
        await knex('members_paid_subscription_events').whereIn('id', toUpdate.map(row => row.id)).del();
        await knex.batchInsert('members_paid_subscription_events', toUpdate);
    },
    async function down() {}
);
