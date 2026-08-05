const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('posts_meta', 'email_public_preview', {
        type: 'boolean',
        nullable: false,
        defaultTo: true
    }, {algorithm: 'auto'}),
    createAddColumnMigration('posts_meta', 'email_public_preview_audience', {
        type: 'string',
        maxlength: 50,
        nullable: true
    }, {algorithm: 'auto'})
);
