const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');
module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('users', 'threads', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    })
);