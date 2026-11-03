const customThemeSettingsService = require('../../services/custom-theme-settings').default;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'custom_theme_settings',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: true,
    query() {
      return customThemeSettingsService.service.listSettings();
    },
  },

  edit: {
    headers: {
      cacheInvalidate: true,
    },
    permissions: true,
    query(frame) {
      return customThemeSettingsService.service.updateSettings(frame.data.custom_theme_settings);
    },
  },
};

module.exports = controller;
