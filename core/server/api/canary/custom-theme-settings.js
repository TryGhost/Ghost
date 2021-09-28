const customThemeSettingsService = require('../../services/custom-theme-settings');

module.exports = {
    docName: 'custom_theme_settings',

    browse: {
        permissions: true,
        query() {
            return customThemeSettingsService.listSettings();
        }
    },

    edit: {
        headers: {
            cacheInvalidate: true
        },
        permissions: true,
        query(frame) {
            return customThemeSettingsService.updateSettings(frame.data.custom_theme_settings);
        }
    }
};
