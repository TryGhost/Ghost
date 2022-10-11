const {addTable} = require('../../utils');

module.exports = addTable('members_feedback', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    score: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
