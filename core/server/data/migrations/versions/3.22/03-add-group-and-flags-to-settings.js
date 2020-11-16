const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('settings', 'group', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'core'
    }),
    createAddColumnMigration('settings', 'flags', {
        type: 'string',
        maxlength: 50,
        nullable: true
    })
);
