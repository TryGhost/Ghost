const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('products', 'visible', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});

module.exports.up = async () => {
    // noop - column will be replaced with `visibility` instead
};
