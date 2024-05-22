const {addTable} = require('../../utils');

module.exports = addTable('posts_products', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
    product_id: {type: 'string', maxlength: 24, nullable: false, references: 'products.id', cascadeDelete: true},
    sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
});
