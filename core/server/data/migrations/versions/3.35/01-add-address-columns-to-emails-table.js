const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('emails', 'from', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('emails', 'reply_to', {
        type: 'string',
        maxlength: 191,
        nullable: true
    })
);
