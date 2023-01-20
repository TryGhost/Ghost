const {addTable} = require('../../utils');

const mentionsTable = addTable('mentions', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    source: {type: 'string', maxlength: 2000, nullable: false},
    source_title: {type: 'string', maxlength: 2000, nullable: true},
    source_site_title: {type: 'string', maxlength: 2000, nullable: true},
    source_excerpt: {type: 'string', maxlength: 2000, nullable: true},
    source_author: {type: 'string', maxlength: 2000, nullable: true},
    source_publisher: {type: 'string', maxlength: 2000, nullable: true},
    source_featured_image: {type: 'string', maxlength: 2000, nullable: true},
    source_favicon: {type: 'string', maxlength: 2000, nullable: true},
    target: {type: 'string', maxlength: 2000, nullable: false},
    resource_id: {type: 'string', maxlength: 24, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    payload: {type: 'text', maxlength: 65535, nullable: true}
});

module.exports = {
    up: mentionsTable.up,
    down: mentionsTable.down
};
