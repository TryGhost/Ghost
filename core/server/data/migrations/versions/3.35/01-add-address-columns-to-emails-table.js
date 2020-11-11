const {createAddColumnMigration, combineTransactionalMigrations} = require('../../utils');

module.exports = combineTransactionalMigrations(
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
