const {addTable} = require('../../utils');

module.exports = addTable('temp_mail_events', {
    id: {type: 'string', maxlength: 100, nullable: false, primary: true},
    type: {type: 'string', maxlength: 50, nullable: false},
    message_id: {type: 'string', maxlength: 150, nullable: false},
    recipient: {type: 'string', maxlength: 191, nullable: false},
    occurred_at: {type: 'dateTime', nullable: false}
});
