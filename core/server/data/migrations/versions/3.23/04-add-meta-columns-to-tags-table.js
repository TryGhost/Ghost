const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('tags', 'og_image', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('tags', 'og_title', {
        type: 'string',
        maxlength: 300,
        nullable: true
    }),
    createAddColumnMigration('tags', 'og_description', {
        type: 'string',
        maxlength: 500,
        nullable: true
    }),
    createAddColumnMigration('tags', 'twitter_image', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('tags', 'twitter_title', {
        type: 'string',
        maxlength: 300,
        nullable: true
    }),
    createAddColumnMigration('tags', 'twitter_description', {
        type: 'string',
        maxlength: 500,
        nullable: true
    }),
    createAddColumnMigration('tags', 'codeinjection_head', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('tags', 'codeinjection_foot', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('tags', 'canonical_url', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('tags', 'accent_color', {
        type: 'string',
        maxlength: 50,
        nullable: true
    })
);
