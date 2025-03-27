const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Backfilling "offer_id" column in "members_stripe_customers_subscriptions" by matching tier and cadence');

        const subquery = `
            SELECT
                members_stripe_customers_subscriptions.id as subscription_id,
                offer_redemptions.offer_id as offer_id
            FROM
                members_stripe_customers_subscriptions
                JOIN offer_redemptions ON offer_redemptions.subscription_id = members_stripe_customers_subscriptions.id
                JOIN offers ON offers.id = offer_redemptions.offer_id
                JOIN stripe_prices ON members_stripe_customers_subscriptions.stripe_price_id = stripe_prices.stripe_price_id
                JOIN stripe_products ON stripe_prices.stripe_product_id = stripe_products.stripe_product_id
            WHERE
                offers.product_id = stripe_products.product_id
                AND offers.interval = stripe_prices.interval
                AND members_stripe_customers_subscriptions.offer_id is null
        `;

        if (DatabaseInfo.isSQLite(knex)) {
            // Less optimized for SQLite
            const result = await knex.raw(subquery);
            const updatedRows = result.length;
            const subscriptionsToUpdate = result;

            logging.info(`Setting the offer_id for ${updatedRows} members_stripe_customers_subscriptions`);

            // eslint-disable-next-line no-restricted-syntax
            for (const u of subscriptionsToUpdate) { 
                // eslint-disable-next-line no-restricted-syntax
                await knex('members_stripe_customers_subscriptions')
                    .update('offer_id', u.offer_id)
                    .where('id', u.subscription_id); 
            }
        } else {
            // Single update query
            const query = `
                UPDATE 
                    members_stripe_customers_subscriptions,
                    (${subquery}) as c
                SET members_stripe_customers_subscriptions.offer_id = c.offer_id
                WHERE c.subscription_id = members_stripe_customers_subscriptions.id
            `;

            const result = await knex.raw(query);
            const updatedRows = result[0].affectedRows;

            logging.info(`Updated ${updatedRows} members_stripe_customers_subscriptions with an offer_id`);
        }
    },
    async function down() {
        // We risk losing data if we would reset offer_id here
    }
);
