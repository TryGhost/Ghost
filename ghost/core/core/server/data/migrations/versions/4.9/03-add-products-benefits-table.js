const {addTable} = require('../../utils');

module.exports = addTable('products_benefits', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    product_id: {type: 'string', maxlength: 24, nullable: false, references: 'products.id', cascadeDelete: true},
    benefit_id: {type: 'string', maxlength: 24, nullable: false, references: 'benefits.id', cascadeDelete: true},
    sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
});
