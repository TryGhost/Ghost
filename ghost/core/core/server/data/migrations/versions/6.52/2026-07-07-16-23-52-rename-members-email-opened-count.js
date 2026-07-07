const {createRenameColumnMigration} = require('../../utils');

module.exports = createRenameColumnMigration('members', 'email_opened_count', 'newsletter_email_open_count');
