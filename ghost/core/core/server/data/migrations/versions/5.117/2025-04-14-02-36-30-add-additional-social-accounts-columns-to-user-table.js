const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');
module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('users', 'threads', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('users', 'bluesky', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('users', 'mastodon', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('users', 'tiktok', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('users', 'youtube', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('users', 'instagram', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('users', 'linkedin', {
        type: 'string',
        maxlength: 191,
        nullable: true
    })
);