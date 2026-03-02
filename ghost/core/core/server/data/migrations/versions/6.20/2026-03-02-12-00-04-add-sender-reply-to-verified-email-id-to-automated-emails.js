const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('automated_emails', 'sender_reply_to_verified_email_id', {
    type: 'string', maxlength: 24, nullable: true, references: 'verified_emails.id', setNullDelete: true
});
