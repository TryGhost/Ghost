const {combineTransactionalMigrations, createDropColumnMigration} = require('../../utils');

module.exports = combineTransactionalMigrations(
    createDropColumnMigration('users', 'ghost_auth_access_token', {
        type: 'string',
        nullable: true,
        maxlength: 32
    }),
    createDropColumnMigration('users', 'ghost_auth_id', {
        type: 'string',
        nullable: true,
        maxlength: 24
    })
);
