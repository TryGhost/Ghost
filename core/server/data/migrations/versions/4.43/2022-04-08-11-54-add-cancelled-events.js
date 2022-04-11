const ObjectID = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const cancelledSubscriptions = await knex
            .select(
                'members.id as member_id',
                'members_stripe_customers_subscriptions.id',
                'members_stripe_customers_subscriptions.stripe_price_id',
                'members_stripe_customers_subscriptions.plan_currency',
                'members_stripe_customers_subscriptions.updated_at'
            )
            .from('members_stripe_customers_subscriptions')
            .join('members_stripe_customers', 'members_stripe_customers.customer_id', '=', 'members_stripe_customers_subscriptions.customer_id')
            .join('members', 'members_stripe_customers.member_id', '=', 'members.id')
            .where('members_stripe_customers_subscriptions.cancel_at_period_end', true)
            .whereNot('members_stripe_customers_subscriptions.status', 'canceled');

        if (cancelledSubscriptions.length === 0) {
            logging.info('No missing cancelled events - skipping migration');
            return;
        }

        const eventsToInsert = cancelledSubscriptions.map((subscription) => {
            const event = {
                id: (new ObjectID()).toHexString(),
                type: 'canceled',
                member_id: subscription.member_id,
                subscription_id: subscription.id,
                from_plan: subscription.stripe_price_id,
                to_plan: subscription.stripe_price_id,
                currency: subscription.plan_currency,
                source: 'migration',
                mrr_delta: 0,
                created_at: subscription.updated_at
            };

            return event;
        });

        logging.info(`Found ${eventsToInsert.length} missing cancellation events`);
        await knex('members_paid_subscription_events').insert(eventsToInsert);
    },
    async function down(knex) {
        logging.info('Deleting all members_paid_subscription_events with a "type" of "cancelled"');
        await knex('members_paid_subscription_events').where({type: 'canceled', source: 'migration'}).del();
    }
);
