const {addTable} = require('../../utils');

module.exports = addTable('members_link_click_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    link_id: {type: 'string', maxlength: 24, nullable: false, references: 'link_redirects.id', cascadeDelete: true},
    created_at: {type: 'dateTime', nullable: false}
});
