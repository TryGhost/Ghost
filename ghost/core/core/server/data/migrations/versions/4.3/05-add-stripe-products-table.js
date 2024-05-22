const {addTable} = require('../../utils');

module.exports = addTable('stripe_products', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    product_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'products.id', cascadeDelete: true},
    stripe_product_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
