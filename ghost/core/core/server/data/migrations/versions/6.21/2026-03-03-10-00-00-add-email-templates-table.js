const {addTable} = require('../../utils');

module.exports = addTable('email_templates', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'light'},
    header_background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'transparent'},
    header_image: {type: 'string', maxlength: 2000, nullable: true},
    show_header_title: {type: 'boolean', nullable: false, defaultTo: false},
    footer_content: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    title_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif', validations: {isIn: [['serif', 'sans_serif']]}},
    title_font_weight: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'bold', validations: {isIn: [['normal', 'medium', 'semibold', 'bold']]}},
    body_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif', validations: {isIn: [['serif', 'sans_serif']]}},
    section_title_color: {type: 'string', maxlength: 50, nullable: true},
    button_color: {type: 'string', maxlength: 50, nullable: true, defaultTo: 'accent'},
    button_style: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'fill', validations: {isIn: [['fill', 'outline']]}},
    button_corners: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'rounded', validations: {isIn: [['square', 'rounded', 'pill']]}},
    link_color: {type: 'string', maxlength: 50, nullable: true, defaultTo: 'accent'},
    link_style: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'underline', validations: {isIn: [['underline', 'regular', 'bold']]}},
    image_corners: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'square', validations: {isIn: [['square', 'rounded']]}},
    divider_color: {type: 'string', maxlength: 50, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
