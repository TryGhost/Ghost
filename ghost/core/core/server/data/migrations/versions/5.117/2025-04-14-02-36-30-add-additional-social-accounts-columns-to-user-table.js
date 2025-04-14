const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');
module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('users', 'threads', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('users', 'bluesky', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('users', 'mastodon', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('users', 'tiktok', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('users', 'youtube', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('users', 'instagram', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('users', 'linkedin', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    })
);
