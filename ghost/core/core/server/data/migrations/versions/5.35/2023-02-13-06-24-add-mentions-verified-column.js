const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('mentions', 'verified', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
