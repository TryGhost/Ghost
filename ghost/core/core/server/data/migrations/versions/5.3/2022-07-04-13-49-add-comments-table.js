const {addTable} = require('../../utils');

module.exports = addTable('comments', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'posts.id', cascadeDelete: true},
    member_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'members.id'},
    parent_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'comments.id'},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'published', validations: {isIn: [['published', 'hidden', 'deleted']]}},
    html: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    edited_at: {type: 'dateTime', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: false}
});
