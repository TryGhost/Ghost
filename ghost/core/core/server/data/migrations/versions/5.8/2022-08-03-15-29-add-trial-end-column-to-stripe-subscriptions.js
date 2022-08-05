const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_stripe_customers_subscriptions', 'trial_end_at', {
    type: 'dateTime',
    nullable: true
});
