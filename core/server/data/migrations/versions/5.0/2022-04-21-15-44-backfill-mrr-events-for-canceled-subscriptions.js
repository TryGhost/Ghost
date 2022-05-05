const ObjectID = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const subscriptions = await knex('members_stripe_customers_subscriptions')
            .leftJoin('members_paid_subscription_events', 'members_stripe_customers_subscriptions.id', '=', 'members_paid_subscription_events.subscription_id')
            .join('members_stripe_customers', 'members_stripe_customers_subscriptions.customer_id', '=', 'members_stripe_customers.customer_id')
            .join('members', 'members_stripe_customers.member_id', '=', 'members.id')
            .where('members_stripe_customers_subscriptions.cancel_at_period_end', '=', true)
            .where('members_stripe_customers_subscriptions.mrr', '!=', 0)
            .where(knex.raw(`(members_paid_subscription_events.type = 'canceled' OR members_paid_subscription_events.type is null)`))
            .select(
                'members_paid_subscription_events.id AS event_id',
                'members_stripe_customers_subscriptions.id',
                'members_stripe_customers_subscriptions.updated_at',
                'members_stripe_customers_subscriptions.mrr',
                'members_stripe_customers_subscriptions.stripe_price_id',
                'members_stripe_customers_subscriptions.plan_currency',
                'members_stripe_customers.member_id'
            )
            .orderBy('members_paid_subscription_events.created_at', 'asc');

        if (subscriptions.length === 0) {
            logging.info('No canceled subscriptions found, skipping migration.');
            return;
        } else {
            logging.info(`Found ${subscriptions.length} canceled subscriptions, inserting MRR events.`);
        }

        const toUpdate = {};
        const toInsert = {};

        // eslint-disable-next-line no-restricted-syntax
        subscriptions.forEach((subscription) => {
            if (subscription.event_id) {
                // if an event exists, update it
                // we always update the latest event for a subscription due to the orderBy ASC
                toUpdate[subscription.id] = {
                    id: subscription.event_id,
                    mrr_delta: -subscription.mrr
                };
            } else {
                toInsert[subscription.id] = {
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
                };
            }
        });

        await knex.batchInsert('members_paid_subscription_events', Object.values(toInsert));

        // eslint-disable-next-line no-restricted-syntax
        for (const event of Object.values(toUpdate)) {
            await knex('members_paid_subscription_events').update('mrr_delta', event.mrr_delta).where('id', event.id);
        }
    },
    async function down() {}
);
