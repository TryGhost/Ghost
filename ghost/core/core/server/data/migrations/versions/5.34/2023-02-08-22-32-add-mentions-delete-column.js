const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('mentions', 'deleted', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});