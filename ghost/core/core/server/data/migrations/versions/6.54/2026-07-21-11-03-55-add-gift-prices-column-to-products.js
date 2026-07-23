const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('products', 'gift_prices', {
    type: 'text',
    maxlength: 65535,
    nullable: true
});
