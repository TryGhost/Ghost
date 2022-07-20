const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_stripe_customers_subscriptions', 'stripe_price_id', {
    type: 'string',
    maxlength: 255,
    nullable: false,
    unique: false,
    defaultTo: '',
    index: true
});
