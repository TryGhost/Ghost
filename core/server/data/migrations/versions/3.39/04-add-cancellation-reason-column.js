const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_stripe_customers_subscriptions', 'cancellation_reason', {
    type: 'string',
    maxlength: 500,
    nullable: true
});
