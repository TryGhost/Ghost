const {addTable} = require('../../utils');

module.exports = addTable('email_design_settings', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'light'},
    header_background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'transparent'},
    header_image: {type: 'string', maxlength: 2000, nullable: true},
    show_header_title: {type: 'boolean', nullable: false, defaultTo: true},
    footer_content: {type: 'text', maxlength: 1000000000, nullable: true},
    button_color: {type: 'string', maxlength: 50, nullable: true, defaultTo: 'accent'},
    button_corners: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'rounded'},
    button_style: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'fill'},
    link_color: {type: 'string', maxlength: 50, nullable: true, defaultTo: 'accent'},
    link_style: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'underline'},
    body_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif'},
    // Named "title_*" to match the newsletters table; applies to headings (and post title in newsletters)
    title_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif'},
    title_font_weight: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'bold'},
    image_corners: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'square'},
    divider_color: {type: 'string', maxlength: 50, nullable: true},
    section_title_color: {type: 'string', maxlength: 50, nullable: true},
    show_badge: {type: 'boolean', nullable: false, defaultTo: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
