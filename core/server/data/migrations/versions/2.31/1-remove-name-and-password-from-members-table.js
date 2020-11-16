const {combineNonTransactionalMigrations, createDropColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createDropColumnMigration('members', 'password', {
        type: 'string',
        maxlength: 60,
        nullable: true
    }),
    createDropColumnMigration('members', 'name', {
        type: 'string',
        maxlength: 191,
        nullable: false,
        defaultTo: ''
    })
);
