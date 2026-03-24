const ghostBookshelf = require('./base');

const EmailTemplate = ghostBookshelf.Model.extend({
    tableName: 'email_templates',

    defaults() {
        return {
            show_publication_title: true,
            show_badge: true,
            background_color: '#ffffff',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            body_font_category: 'sans_serif',
            header_background_color: '#ffffff',
            title_alignment: 'center',
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: 'accent',
            link_style: 'underline',
            image_corners: 'square'
        };
    },

    automatedEmails() {
        return this.hasMany('AutomatedEmail', 'email_template_id');
    }
});

module.exports = {
    EmailTemplate: ghostBookshelf.model('EmailTemplate', EmailTemplate)
};
