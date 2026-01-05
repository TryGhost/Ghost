const {addTable} = require('../../utils');

module.exports = addTable('members_comment_bans', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true, index: true},
    created_at: {type: 'dateTime', nullable: false},
    expires_at: {type: 'dateTime', nullable: true},
    deleted_at: {type: 'dateTime', nullable: true},
    reason: {type: 'string', maxlength: 2000, nullable: true},
    updated_at: {type: 'dateTime', nullable: true}
});
