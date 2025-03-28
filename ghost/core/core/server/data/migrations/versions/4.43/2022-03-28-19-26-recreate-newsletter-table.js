const {recreateTable} = require('../../utils');

module.exports = recreateTable('newsletters', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    description: {type: 'string', maxlength: 2000, nullable: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    sender_name: {type: 'string', maxlength: 191, nullable: false},
    sender_email: {type: 'string', maxlength: 191, nullable: true},
    sender_reply_to: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'newsletter', validations: {isIn: [['newsletter', 'support']]}},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'active', validations: {isIn: [['active', 'archived']]}},
    visibility: {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'members'
    },
    subscribe_on_signup: {type: 'boolean', nullable: false, defaultTo: true},
    sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    header_image: {type: 'string', maxlength: 2000, nullable: true},
    show_header_icon: {type: 'boolean', nullable: false, defaultTo: true},
    show_header_title: {type: 'boolean', nullable: false, defaultTo: true},
    title_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif', validations: {isIn: [['serif', 'sans_serif']]}},
    title_alignment: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'center', validations: {isIn: [['center', 'left']]}},
    show_feature_image: {type: 'boolean', nullable: false, defaultTo: true},
    body_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif', validations: {isIn: [['serif', 'sans_serif']]}},
    footer_content: {type: 'text', maxlength: 1000000000, nullable: true},
    show_badge: {type: 'boolean', nullable: false, defaultTo: true}
});
