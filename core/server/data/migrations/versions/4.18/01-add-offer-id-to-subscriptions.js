const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_stripe_customers_subscriptions', 'offer_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'offers.id'
});
