const {combineNonTransactionalMigrations,createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('post_revisions', 'feature_image_caption', {
        type: 'string',
        maxlength: 65535,
        nullable: true
    }),
    createAddColumnMigration('post_revisions', 'feature_image_alt', {
        type: 'string',
        maxlength: 191,
        nullable: true
    })
);
