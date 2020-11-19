const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('posts', 'og_image', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('posts', 'og_title', {
        type: 'string',
        maxlength: 300,
        nullable: true
    }),
    createAddColumnMigration('posts', 'og_description', {
        type: 'string',
        maxlength: 500,
        nullable: true
    }),
    createAddColumnMigration('posts', 'twitter_image', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('posts', 'twitter_title', {
        type: 'string',
        maxlength: 300,
        nullable: true
    }),
    createAddColumnMigration('posts', 'twitter_description', {
        type: 'string',
        maxlength: 500,
        nullable: true
    })
);
