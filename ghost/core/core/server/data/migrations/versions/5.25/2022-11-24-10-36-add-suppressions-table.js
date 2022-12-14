const {addTable} = require('../../utils');

module.exports = addTable('suppressions', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    email_address: {type: 'string', maxlength: 191, nullable: false, unique: true},
    email_id: {type: 'string', maxlength: 24, nullable: true, references: 'emails.id'},
    reason: {type: 'string', maxlength: 50, nullable: false},
    created_at: {type: 'dateTime', nullable: false}
});
