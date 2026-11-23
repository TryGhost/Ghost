const customThemeSettingsService = require('../../services/custom-theme-settings').default;
const themePreview = require('../../services/themes/preview');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'custom_theme_settings',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    // `theme`: an installed theme other than the active one, e.g. to preview it
    options: ['theme'],
    permissions: true,
    query(frame) {
      return themePreview.browseSettings(frame?.options?.theme);
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
