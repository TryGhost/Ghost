const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('posts', 'codeinjection_head', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('posts', 'codeinjection_foot', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    })
);
