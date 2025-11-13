const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('email_batches', 'scheduled_at', {
        type: 'dateTime',
        nullable: true
    }),
    createAddColumnMigration('email_batches', 'retry_count', {
        type: 'integer',
        nullable: false,
        defaultTo: 0,
        unsigned: true
    })
);
