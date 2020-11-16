const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_stripe_customers_subscriptions', 'cancel_at_period_end', {
    type: 'bool',
    nullable: false,
    defaultTo: false
});
