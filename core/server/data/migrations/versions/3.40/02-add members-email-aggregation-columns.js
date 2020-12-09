const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('members', 'email_count', {
        type: 'integer',
        unsigned: true,
        nullable: false,
        defaultTo: 0
    }),
    createAddColumnMigration('members', 'email_opened_count', {
        type: 'integer',
        unsigned: true,
        nullable: false,
        defaultTo: 0
    })
);
