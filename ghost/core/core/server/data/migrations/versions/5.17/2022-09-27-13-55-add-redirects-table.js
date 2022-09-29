const {addTable} = require('../../utils');

module.exports = addTable('redirects', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    from: {type: 'string', maxlength: 2000, nullable: false},
    to: {type: 'string', maxlength: 2000, nullable: false},
    post_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'posts.id', setNullDelete: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
