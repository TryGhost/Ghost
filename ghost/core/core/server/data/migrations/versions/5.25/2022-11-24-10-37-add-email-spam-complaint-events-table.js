const {addTable} = require('../../utils');

module.exports = addTable('email_spam_complaint_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    email_id: {type: 'string', maxlength: 24, nullable: false, references: 'emails.id'},
    email_address: {type: 'string', maxlength: 191, nullable: false, unique: false},
    created_at: {type: 'dateTime', nullable: false},
    '@@UNIQUE_CONSTRAINTS@@': [
        ['email_id', 'member_id']
    ]
});
