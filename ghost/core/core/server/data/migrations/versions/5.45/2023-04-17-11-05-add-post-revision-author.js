const {combineNonTransactionalMigrations,createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('post_revisions', 'author_id', {
        type: 'string',
        maxlength: 24,
        nullable: true,
        references: 'users.id',
        cascadeDelete: false,
        constraintName: 'post_revs_author_id_foreign'
    }),
    createAddColumnMigration('post_revisions', 'title', {
        type: 'string',
        maxlength: 2000,
        nullable: true,
        validations: {
            isLength: {
                max: 255
            }
        }
    })
);
