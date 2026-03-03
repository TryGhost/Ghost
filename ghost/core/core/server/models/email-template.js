const ghostBookshelf = require('./base');

const EmailTemplate = ghostBookshelf.Model.extend({
    tableName: 'email_templates',

    defaults() {
        return {
            background_color: 'light',
            header_background_color: 'transparent',
            show_header_title: false,
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            body_font_category: 'sans_serif',
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: 'accent',
            link_style: 'underline',
            image_corners: 'square'
        };
    }
});

module.exports = {
    EmailTemplate: ghostBookshelf.model('EmailTemplate', EmailTemplate)
};
