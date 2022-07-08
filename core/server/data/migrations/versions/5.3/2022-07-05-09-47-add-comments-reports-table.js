const {addTable} = require('../../utils');

module.exports = addTable('comment_reports', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    comment_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'comments.id', cascadeDelete: true},
    member_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'members.id'},
    reason: {type: 'text', maxlength: 65535, nullable: false},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: false}
});
