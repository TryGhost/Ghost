const {addTable} = require('../../utils');

module.exports = addTable('milestones', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    type: {type: 'string', maxlength: 24, nullable: false},
    value: {type: 'integer', nullable: false},
    currency: {type: 'string', maxlength: 24, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    email_sent_at: {type: 'dateTime', nullable: true}
});
