const {createAddColumnMigration} = require('../../utils')

module.exports = createAddColumnMigration('products', 'yearly_price', {
    type: 'string',
    maxlength: 24,
    references: 'stripe_prices.id',
    nullable: true
})
