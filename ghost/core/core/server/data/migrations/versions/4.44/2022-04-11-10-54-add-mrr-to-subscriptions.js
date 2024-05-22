const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_stripe_customers_subscriptions', 'mrr', {
    type: 'integer',
    unsigned: true,
    nullable: false,
    defaultTo: 0
});
