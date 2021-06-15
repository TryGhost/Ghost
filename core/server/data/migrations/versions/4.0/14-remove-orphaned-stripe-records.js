const {createIrreversibleMigration} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = createIrreversibleMigration(async function up(connection) {
    if (connection.client.config.client === 'mysql') {
        logging.info('Skipping removal of orphaned stripe records for MySQL');
        return;
    }

    logging.info('Removing orphaned rows from members_stripe_customers');
    await connection.raw(`
        DELETE FROM
            members_stripe_customers
        WHERE
            member_id
        NOT IN (
            SELECT
                id
            FROM members
        );
    `);

    logging.info('Removing orphaned rows from members_stripe_customers_subscriptions');
    await connection.raw(`
        DELETE FROM
            members_stripe_customers_subscriptions
        WHERE
            customer_id
        NOT IN (
            SELECT
                customer_id
            FROM members_stripe_customers
        );
    `);
});
