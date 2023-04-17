const {combineNonTransactionalMigrations,createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('post_revisions', 'created_by', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('post_revisions', 'title', {
        type: 'string',
        maxlength: 24,
        nullable: true,
        validations: {
            isLength: {
                max: 255
            }
        }
    })
);
