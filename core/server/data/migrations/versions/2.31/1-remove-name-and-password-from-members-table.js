const {combineTransactionalMigrations, createDropColumnMigration} = require('../../utils');

module.exports = combineTransactionalMigrations(
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
