const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('products', 'visibility', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'none'
});
