const {addTable} = require('../../utils');

module.exports = addTable('automated_email_recipients', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    automated_email_id: {type: 'string', maxlength: 24, nullable: false, references: 'automated_emails.id'},
    member_id: {type: 'string', maxlength: 24, nullable: false, index: true},
    member_uuid: {type: 'string', maxlength: 36, nullable: false},
    member_email: {type: 'string', maxlength: 191, nullable: false},
    member_name: {type: 'string', maxlength: 191, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
