const _ = require('lodash');
const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        // eslint-disable-next-line no-restricted-syntax
        const allStripeSubscriptions = await knex('members')
            .select([
                'members.id',
                'members.status',
                'members_products.product_id',
                'members_stripe_customers_subscriptions.id AS mscs_id',
                'members_stripe_customers_subscriptions.status AS mscs_status',
                'members_stripe_customers_subscriptions.offer_id'
            ])
            .innerJoin('members_products', 'members.id', 'members_products.member_id')
            .innerJoin('members_stripe_customers', 'members.id', 'members_stripe_customers.member_id')
            .innerJoin('members_stripe_customers_subscriptions', 'members_stripe_customers.customer_id', 'members_stripe_customers_subscriptions.customer_id');

        if (!allStripeSubscriptions.length) {
            logging.info(`No Stripe subscription rows found - skipping subscription backfill`);
            return;
        }

        const now = knex.raw('CURRENT_TIMESTAMP');

        const ghostSubscriptionIds = [];

        const rowsToInsert = allStripeSubscriptions.map((m) => {
            const subscriptionId = ObjectId().toHexString();

            const row = {
                id: subscriptionId,
                type: 'paid', //handle comped
                member_id: m.id,
                created_at: now
            };

            row.status = m.mscs_status;
            row.tier_id = m.product_id;
            row.offer_id = m.offer_id;

            ghostSubscriptionIds.push({
                ghost_subscription_id: subscriptionId,
                mscs_id: m.mscs_id
            });

            return row;
        });

        logging.info(`Inserting ${rowsToInsert.length} backfilled subscriptions`);
        await knex.batchInsert('subscriptions', rowsToInsert);

        if (ghostSubscriptionIds.length) {
            const batches = _.chunk(ghostSubscriptionIds, 1000);
            logging.info(`Backfilling ${ghostSubscriptionIds.length} Ghost subscription IDs into members_stripe_customers_subscriptions table via ${batches.length} batches`);

            for (const batch of batches) { // eslint-disable-line no-restricted-syntax
                const batchResponse = await knex('members_stripe_customers_subscriptions').insert(batch.map(r => ({
                    id: r.mscs_id,
                    ghost_subscription_id: r.ghost_subscription_id,

                    // We don't care about these but we're forced to include them because we're doing an INSERT
                    created_at: knex.raw('NOW()'),
                    created_by: '',
                    customer_id: '',
                    current_period_end: knex.raw('NOW()'),
                    plan_amount: 0,
                    plan_currency: '',
                    plan_id: '',
                    plan_interval: '',
                    plan_nickname: '',
                    start_date: knex.raw('NOW()'),
                    status: '',
                    subscription_id: ''
                }))).onConflict('id').merge(['ghost_subscription_id']);

                // If we did end up inserting rows, that's not good and we should hard exit the migration
                if (batchResponse[0] !== 0) {
                    logging.error(`Inserted ${batchResponse[0]} members_stripe_customers_subscriptions, expected 0`);
                    throw new Error('Rolling back');
                }
            }
        } else {
            logging.info(`No new Ghost subscriptions need backfilling into members_stripe_customers_subscriptions`);
        }
    },
    async function down(knex) {
        await knex('members_stripe_customers_subscriptions').update('ghost_subscription_id', null);
        await knex('subscriptions').del();
    }
);
