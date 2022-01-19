const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('products', 'active', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
