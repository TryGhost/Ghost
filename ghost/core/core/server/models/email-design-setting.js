const ghostBookshelf = require('./base');

const EmailDesignSetting = ghostBookshelf.Model.extend({
    tableName: 'email_design_settings',

    defaults() {
        return {
            background_color: 'light',
            header_background_color: 'transparent',
            show_header_icon: true,
            show_header_title: true,
            button_color: 'accent',
            button_corners: 'rounded',
            button_style: 'fill',
            link_color: 'accent',
            link_style: 'underline',
            body_font_category: 'sans_serif',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            image_corners: 'square',
            show_badge: true
        };
    }
});

module.exports = {
    EmailDesignSetting: ghostBookshelf.model('EmailDesignSetting', EmailDesignSetting)
};
