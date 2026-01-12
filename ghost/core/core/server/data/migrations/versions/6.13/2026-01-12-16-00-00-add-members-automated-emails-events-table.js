const {addTable} = require('../../utils');

module.exports = addTable('members_automated_emails_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    automated_email_id: {type: 'string', maxlength: 24, nullable: false, references: 'automated_emails.id', cascadeDelete: true},
    created_at: {type: 'dateTime', nullable: false}
});

