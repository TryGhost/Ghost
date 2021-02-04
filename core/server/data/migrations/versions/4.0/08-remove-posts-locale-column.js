const {combineNonTransactionalMigrations, createDropColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createDropColumnMigration('posts', 'locale', {
        type: 'string',
        nullable: true,
        maxlength: 6
    }),
    createDropColumnMigration('users', 'locale', {
        type: 'string',
        nullable: true,
        maxlength: 6
    })
);
