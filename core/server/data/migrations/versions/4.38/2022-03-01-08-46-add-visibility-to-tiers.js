const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('products', 'visible', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
