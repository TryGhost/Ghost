const {addTable} = require('../../utils');

const mentionsTable = addTable('mentions', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    source: {type: 'string', maxlength: 2000, nullable: false},
    title: {type: 'string', maxlength: 2000, nullable: true},
    description: {type: 'string', maxlength: 2000, nullable: true},
    author: {type: 'string', maxlength: 2000, nullable: true},
    publisher: {type: 'string', maxlength: 2000, nullable: true},
    thumbnail: {type: 'string', maxlength: 2000, nullable: true},
    icon: {type: 'string', maxlength: 2000, nullable: true},
    published_at: {type: 'dateTime', nullable: true},
    target: {type: 'string', maxlength: 2000, nullable: false},
    target_post_id: {type: 'string', maxlength: 24, nullable: true, references: 'posts.id'},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    payload: {type: 'text', maxlength: 65535, fieldtype: 'long', nullable: true}
});

module.exports = {
    up: mentionsTable.up,
    down: mentionsTable.down
};
