const {createRenameColumnMigration} = require('../../utils');

module.exports = createRenameColumnMigration('members', 'email_count', 'newsletter_email_count');
