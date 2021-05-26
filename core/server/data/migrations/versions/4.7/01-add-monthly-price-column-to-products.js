const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('products', 'monthly_price', {
    type: 'string',
    maxlength: 24,
    references: 'stripe_prices.id',
    nullable: true
});
