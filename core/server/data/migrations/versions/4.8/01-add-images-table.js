const {addTable} = require('../../utils');

module.exports = addTable('images', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    imageable_id: {type: 'string', maxlength: 24, nullable: false},
    imageable_type: {type: 'string', maxlength: 50, nullable: true/*false*/},
    url: {type: 'string', maxlength: 2000, nullable: true/*false*/},
    width: {type: 'integer', unsigned: true, nullable: true},
    height: {type: 'integer', unsigned: true, nullable: true},
    alt: {type: 'text', maxlength: 65535, nullable: true},
    caption: {type: 'text', maxlength: 65535, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    created_by: {type: 'string', maxlength: 24, nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    updated_by: {type: 'string', maxlength: 24, nullable: true}
});
