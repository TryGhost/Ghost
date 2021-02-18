const {addTable} = require('../../utils');

module.exports = addTable('members_login_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    created_at: {type: 'dateTime', nullable: false}
});
