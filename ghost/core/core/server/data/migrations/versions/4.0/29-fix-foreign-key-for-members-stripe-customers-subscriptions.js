const logging = require('@tryghost/logging');
const {createIrreversibleMigration} = require('../../utils');
const {addForeign, dropForeign} = require('../../../schema/commands');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = createIrreversibleMigration(async (knex) => {
    if (!DatabaseInfo.isSQLite(knex)) {
        return logging.warn('Skipping fixing foreign key for members_stripe_customers_subscriptions - database is not SQLite3');
    }

    logging.info('Fixing foreign keys for members_stripe_customers_subscriptions');

    await dropForeign({
        fromTable: 'members_stripe_customers_subscriptions',
        fromColumn: 'customer_id',
        toTable: 'members_stripe_customers',
        toColumn: 'id',
        transaction: knex
    });
    await dropForeign({
        fromTable: 'members_stripe_customers_subscriptions',
        fromColumn: 'customer_id',
        toTable: 'members_stripe_customers',
        toColumn: 'customer_id',
        transaction: knex
    });
    await addForeign({
        fromTable: 'members_stripe_customers_subscriptions',
        fromColumn: 'customer_id',
        toTable: 'members_stripe_customers',
        toColumn: 'customer_id',
        cascadeDelete: true,
        transaction: knex
    });
});
