const logging = require('@tryghost/logging');
const {chunk} = require('lodash');
const ObjectID = require('bson-objectid').default;
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Looking for missing members_products entries');

        const missingEntries = await knex
            .select(
                'members.id as member_id',
                'products.id as product_id'
            )
            .from('members')
            .leftJoin('members_stripe_customers as c', 'members.id', '=', 'c.member_id')
            .leftJoin('members_stripe_customers_subscriptions as s', 'c.customer_id', '=', 's.customer_id')
            .leftJoin('stripe_prices', 's.plan_id', '=', 'stripe_prices.stripe_price_id')
            .leftJoin('stripe_products', 'stripe_prices.stripe_product_id', '=', 'stripe_products.stripe_product_id')
            .leftJoin('products', 'stripe_products.product_id', '=', 'products.id')
            .leftJoin('members_products', function () {
                this
                    .on('members_products.member_id', '=', 'members.id')
                    .andOn('members_products.product_id', '=', 'products.id');
            })
            .whereIn('s.status', [
                'active', 'trialing', 'unpaid', 'past_due'
            ])
            .whereNull('members_products.id');

        if (!missingEntries.length) {
            logging.info('No missing entries found.');
            return;
        }

        logging.info(`Found ${missingEntries.length} missing entries - generating IDs`);
        logging.info(JSON.stringify(missingEntries, null, 4));

        const entriesToInsert = missingEntries.map((entry) => {
            return {
                id: (new ObjectID).toHexString(),
                ...entry
            };
        });

        // We have a limit of 999 variables for SQLite3
        // Each insert will use 3 - so we can insert 333 at a time
        const chunksToInsert = chunk(entriesToInsert, 333);

        for (const chunkToInsert of chunksToInsert) {
            logging.info(`Inserting chunk of ${chunksToInsert.length} entries.`);
            logging.info(JSON.stringify(chunkToInsert, null, 4));
            await knex('members_products').insert(chunkToInsert);
        }
    },
    async function down() {
        // noop
    }
);
