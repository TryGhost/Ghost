const utils = require('../../utils');

module.exports = utils.addTable('email_recipient_failures', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    email_id: {type: 'string', maxlength: 24, nullable: false, references: 'emails.id'},
    member_id: {type: 'string', maxlength: 24, nullable: true},
    email_recipient_id: {type: 'string', maxlength: 24, nullable: false, references: 'email_recipients.id'},
    code: {type: 'integer', nullable: false, unsigned: true},
    enhanced_code: {type: 'string', maxlength: 50, nullable: true},
    message: {type: 'string', maxlength: 2000, nullable: false},
    severity: {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'permanent',
        validations: {isIn: [['temporary', 'permanent']]}
    },
    failed_at: {type: 'dateTime', nullable: false},
    event_id: {type: 'string', maxlength: 255, nullable: true}
});
