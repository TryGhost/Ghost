const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('collections', 'og_image', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('collections', 'og_title', {
        type: 'string',
        maxlength: 300,
        nullable: true
    }),
    createAddColumnMigration('collections', 'og_description', {
        type: 'string',
        maxlength: 500,
        nullable: true
    }),
    createAddColumnMigration('collections', 'twitter_image', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('collections', 'twitter_title', {
        type: 'string',
        maxlength: 300,
        nullable: true
    }),
    createAddColumnMigration('collections', 'twitter_description', {
        type: 'string',
        maxlength: 500,
        nullable: true
    }),
    createAddColumnMigration('collections', 'meta_title', {
        type: 'string',
        maxlength: 2000,
        nullable: true,
        validations: {
            isLength: {
                max: 300
            }
        }
    }),
    createAddColumnMigration('collections', 'meta_description', {
        type: 'string',
        maxlength: 2000,
        nullable: true,
        validations: {
            isLength: {
                max: 500
            }
        }
    }),
    createAddColumnMigration('collections', 'codeinjection_head', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('collections', 'codeinjection_foot', {
        type: 'text',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('collections', 'canonical_url', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('collections', 'accent_color', {
        type: 'string',
        maxlength: 50,
        nullable: true
    })
);

