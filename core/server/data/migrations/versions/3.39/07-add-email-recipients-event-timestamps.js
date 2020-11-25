const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('email_recipients', 'delivered_at', {
        type: 'dateTime',
        nullable: true,
        index: true
    }),
    createAddColumnMigration('email_recipients', 'opened_at', {
        type: 'dateTime',
        nullable: true,
        index: true
    }),
    createAddColumnMigration('email_recipients', 'failed_at', {
        type: 'dateTime',
        nullable: true,
        index: true
    })
);
