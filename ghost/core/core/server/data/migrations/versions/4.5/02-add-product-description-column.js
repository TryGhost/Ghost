const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('products', 'description', {
    type: 'string',
    maxlength: 191,
    nullable: true
});
