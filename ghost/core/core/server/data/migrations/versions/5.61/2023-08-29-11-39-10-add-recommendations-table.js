const {addTable} = require('../../utils');

module.exports = addTable('recommendations', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},

    url: {type: 'string', maxlength: 2000, nullable: false},
    title: {type: 'string', maxlength: 2000, nullable: false},

    excerpt: {type: 'string', maxlength: 2000, nullable: true},
    featured_image: {type: 'string', maxlength: 2000, nullable: true},
    favicon: {type: 'string', maxlength: 2000, nullable: true},

    reason: {type: 'string', maxlength: 2000, nullable: true},
    one_click_subscribe: {type: 'boolean', nullable: false, defaultTo: false},

    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
