const {combineNonTransactionalMigrations, createDropColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createDropColumnMigration('posts', 'meta_title', {
        type: 'string',
        nullable: true,
        maxlength: 2000
    }),
    createDropColumnMigration('posts', 'meta_description', {
        type: 'string',
        nullable: true,
        maxlength: 2000
    }),
    createDropColumnMigration('posts', 'og_image', {
        type: 'string',
        nullable: true,
        maxlength: 2000
    }),
    createDropColumnMigration('posts', 'og_title', {
        type: 'string',
        nullable: true,
        maxlength: 300
    }),
    createDropColumnMigration('posts', 'og_description', {
        type: 'string',
        nullable: true,
        maxlength: 500
    }),
    createDropColumnMigration('posts', 'twitter_image', {
        type: 'string',
        nullable: true,
        maxlength: 2000
    }),
    createDropColumnMigration('posts', 'twitter_title', {
        type: 'string',
        nullable: true,
        maxlength: 300
    }),
    createDropColumnMigration('posts', 'twitter_description', {
        type: 'string',
        nullable: true,
        maxlength: 500
    })
);
