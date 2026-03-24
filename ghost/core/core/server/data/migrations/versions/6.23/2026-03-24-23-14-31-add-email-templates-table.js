const {addTable} = require('../../utils');

module.exports = addTable('email_templates', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    header_image: {type: 'string', maxlength: 2000, nullable: true},
    show_publication_title: {type: 'boolean', nullable: false, defaultTo: true},
    show_badge: {type: 'boolean', nullable: false, defaultTo: true},
    footer_content: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: '#ffffff'},
    title_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif'},
    title_font_weight: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'bold'},
    body_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif'},
    header_background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: '#ffffff'},
    title_alignment: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'center'},
    post_title_color: {type: 'string', maxlength: 50, nullable: true},
    section_title_color: {type: 'string', maxlength: 50, nullable: true},
    button_color: {type: 'string', maxlength: 50, nullable: true, defaultTo: 'accent'},
    button_style: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'fill'},
    button_corners: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'rounded'},
    link_color: {type: 'string', maxlength: 50, nullable: true, defaultTo: 'accent'},
    link_style: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'underline'},
    image_corners: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'square'},
    divider_color: {type: 'string', maxlength: 50, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['slug']
    ]
});
