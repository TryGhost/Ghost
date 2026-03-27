const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('posts_meta', 'editing_by', {
        type: 'string',
        maxlength: 24,
        nullable: true
    }),
    createAddColumnMigration('posts_meta', 'editing_name', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('posts_meta', 'editing_avatar', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('posts_meta', 'editing_session_id', {
        type: 'string',
        maxlength: 50,
        nullable: true
    }),
    createAddColumnMigration('posts_meta', 'editing_heartbeat_at', {
        type: 'dateTime',
        nullable: true
    })
);
