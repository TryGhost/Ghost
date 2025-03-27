const customThemeSettingsService = require('../../services/custom-theme-settings');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'custom_theme_settings',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            return customThemeSettingsService.api.listSettings();
        }
    },

    edit: {
        headers: {
            cacheInvalidate: true
        },
        permissions: true,
        query(frame) {
            return customThemeSettingsService.api.updateSettings(frame.data.custom_theme_settings);
        }
    }
};

module.exports = controller;
