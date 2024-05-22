const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('email_batches', 'error_status_code', {
        type: 'integer',
        nullable: true,
        unsigned: true
    }),

    createAddColumnMigration('email_batches', 'error_message', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),

    createAddColumnMigration('email_batches', 'error_data', {
        type: 'text',
        maxlength: 1000000000,
        fieldtype: 'long',
        nullable: true
    })
);
