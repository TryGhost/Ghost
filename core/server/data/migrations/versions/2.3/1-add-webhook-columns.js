const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('webhooks', 'name', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('webhooks', 'secret', {
        type: 'string',
        maxlength: 191,
        nullable: true
    }),
    createAddColumnMigration('webhooks', 'api_version', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'v2'
    }),
    createAddColumnMigration('webhooks', 'integration_id', {
        type: 'string',
        maxlength: 24,
        nullable: true
    }),
    createAddColumnMigration('webhooks', 'status', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'available'
    }),
    createAddColumnMigration('webhooks', 'last_triggered_at', {
        type: 'dateTime',
        nullable: true
    }),
    createAddColumnMigration('webhooks', 'last_triggered_status', {
        type: 'string',
        maxlength: 50,
        nullable: true
    }),
    createAddColumnMigration('webhooks', 'last_triggered_error', {
        type: 'string',
        maxlength: 50,
        nullable: true
    })
);
