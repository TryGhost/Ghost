const {addTable} = require('../../utils');

module.exports = addTable('members_email_change_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    to_email: {type: 'string', maxlength: 191, nullable: false, unique: false, validations: {isEmail: true}},
    from_email: {type: 'string', maxlength: 191, nullable: false, unique: false, validations: {isEmail: true}},
    created_at: {type: 'dateTime', nullable: false}
});
