const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('members_stripe_customers_subscriptions', 'discount_start', {
        type: 'dateTime',
        nullable: true
    }),

    createAddColumnMigration('members_stripe_customers_subscriptions', 'discount_end', {
        type: 'dateTime',
        nullable: true
    })
);
