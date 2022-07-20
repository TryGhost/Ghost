const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('members', 'last_commented_at', {
        type: 'dateTime',
        nullable: true
    }),

    createAddColumnMigration('members', 'bio', {
        type: 'string',
        nullable: true,
        maxlength: 191,
        validations: {isLength: {max: 50}}
    }),

    createAddColumnMigration('members', 'enable_comment_notifications', {
        type: 'boolean',
        nullable: false,
        defaultTo: true
    })
);
