const {createAddColumnMigration, combineTransactionalMigrations} = require('../../utils');

module.exports = combineTransactionalMigrations(
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
