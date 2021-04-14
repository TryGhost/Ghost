const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_stripe_customers_subscriptions', 'price_id', {
    type: 'string',
    maxlength: 255,
    nullable: false,
    unique: false,
    defaultTo: '',
    references: 'stripe_prices.stripe_price_id'
});
