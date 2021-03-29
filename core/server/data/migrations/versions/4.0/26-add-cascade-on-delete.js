const logging = require('../../../../../shared/logging');
const {createIrreversibleMigration} = require('../../utils');
const {addForeign, dropForeign} = require('../../../schema/commands');

module.exports = createIrreversibleMigration(async (knex) => {
    if (knex.client.config.client !== 'sqlite3') {
        return logging.warn('Skipping adding "on delete cascade" - database is not SQLite3');
    }

    logging.info('Adding on delete cascade for members_labels, members_stripe_customers and members_stripe_customers_subscriptions');

    await dropForeign({
        fromTable: 'members_labels',
        fromColumn: 'member_id',
        toTable: 'members',
        toColumn: 'id',
        transaction: knex
    });
    await addForeign({
        fromTable: 'members_labels',
        fromColumn: 'member_id',
        toTable: 'members',
        toColumn: 'id',
        cascadeDelete: true,
        transaction: knex
    });

    await dropForeign({
        fromTable: 'members_labels',
        fromColumn: 'label_id',
        toTable: 'labels',
        toColumn: 'id',
        transaction: knex
    });
    await addForeign({
        fromTable: 'members_labels',
        fromColumn: 'label_id',
        toTable: 'labels',
        toColumn: 'id',
        cascadeDelete: true,
        transaction: knex
    });

    await dropForeign({
        fromTable: 'members_stripe_customers',
        fromColumn: 'member_id',
        toTable: 'members',
        toColumn: 'id',
        transaction: knex
    });
    await addForeign({
        fromTable: 'members_stripe_customers',
        fromColumn: 'member_id',
        toTable: 'members',
        toColumn: 'id',
        cascadeDelete: true,
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
