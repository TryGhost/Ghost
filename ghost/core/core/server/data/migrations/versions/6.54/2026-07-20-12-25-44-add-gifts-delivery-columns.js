const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('gifts', 'recipient_email', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),

    createAddColumnMigration('gifts', 'buyer_name', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),

    createAddColumnMigration('gifts', 'message', {
        type: 'string',
        maxlength: 500,
        nullable: true
    }),

    createAddColumnMigration('gifts', 'deliver_at', {
        type: 'dateTime',
        nullable: true
    }),

    createAddColumnMigration('gifts', 'delivered_at', {
        type: 'dateTime',
        nullable: true
    })
);
