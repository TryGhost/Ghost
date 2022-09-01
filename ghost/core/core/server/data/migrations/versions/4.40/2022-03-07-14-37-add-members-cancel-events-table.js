const {addTable} = require('../../utils');

module.exports = addTable('members_cancel_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    from_plan: {type: 'string', maxlength: 255, nullable: false},
    created_at: {type: 'dateTime', nullable: false}
});
