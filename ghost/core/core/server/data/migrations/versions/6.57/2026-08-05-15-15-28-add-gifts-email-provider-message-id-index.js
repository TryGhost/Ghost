const {combineNonTransactionalMigrations, createAddIndexMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddIndexMigration('gifts', ['email_provider_message_id'], {length: 31}),
    createAddIndexMigration('gifts', ['delivery_method', 'delivery_status'])
);
