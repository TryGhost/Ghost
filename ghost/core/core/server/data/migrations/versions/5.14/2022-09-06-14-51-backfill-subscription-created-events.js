const ObjectID = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        // Join all subscriptions without a subscription created event
        // We need to filter this because new subscriptions will already have the events
        const subscriptions = await knex('members_stripe_customers_subscriptions as s')
            .select('s.id', 's.start_date as created_at', 'c.member_id')
            .join('members_stripe_customers as c', 'c.customer_id', 's.customer_id')
            .whereNotExists(function () {
                this.select('*')
                    .from('members_subscription_created_events as e')
                    .whereRaw('e.subscription_id = s.id');
            });

        if (subscriptions.length === 0) {
            logging.warn(`Skipping migration because no subscriptions without events found`);
            return;
        }

        const toInsert = subscriptions.map((subscription) => {
            return {
                id: ObjectID().toHexString(),
                subscription_id: subscription.id,
                member_id: subscription.member_id,
                created_at: subscription.created_at
            };
        });

        logging.info(`Inserting ${toInsert.length} subscriptions created events`);
        await knex.batchInsert('members_subscription_created_events', toInsert);
    },
    async function down() {
        // no-op (attribution data will be lost otherwise)
    }
);
