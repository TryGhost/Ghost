const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('products', 'yearly_price_id', {
    type: 'string',
    maxlength: 24,
    nullable: true
});
