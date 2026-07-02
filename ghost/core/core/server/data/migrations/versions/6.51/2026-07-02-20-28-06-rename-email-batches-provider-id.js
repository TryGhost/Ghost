const {createRenameColumnMigration} = require('../../utils');

module.exports = createRenameColumnMigration('email_batches', 'provider_id', 'mailgun_provider_id');
