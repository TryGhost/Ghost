const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('posts_meta', 'bluesky_post_uri', {
        type: 'string',
        maxlength: 500,
        nullable: true
    }),
    createAddColumnMigration('posts_meta', 'bluesky_post_url', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    })
);
