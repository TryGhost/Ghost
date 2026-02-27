const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('members', 'atproto_did', {
        type: 'string',
        maxlength: 191,
        nullable: true,
        unique: true
    }),
    createAddColumnMigration('members', 'bluesky_handle', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('members', 'bluesky_avatar_url', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    })
);
