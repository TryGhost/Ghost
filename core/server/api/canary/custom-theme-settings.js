const customThemeSettingsService = require('../../services/custom-theme-settings');

module.exports = {
    docName: 'custom_theme_settings',

    browse: {
        permissions: true,
        query() {
            return customThemeSettingsService.listSettings();
        }
    }
};
