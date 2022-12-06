const {addTable} = require('../../utils');

module.exports = addTable('media_library', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
    image: {type: 'string', maxlength: 2000, nullable: true},
    width: {type: 'integer', unsigned: true, nullable: true},
    height: {type: 'integer', unsigned: true, nullable: true},
    caption: {type: 'text', maxlength: 65535, nullable: true},
    created_at: {type: 'dateTime', nullable: false}
});
