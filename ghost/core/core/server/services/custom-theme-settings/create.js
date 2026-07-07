const CustomThemeSettingsService = require('../../../shared/custom-theme-settings-cache/custom-theme-settings-service');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.customThemeSettingsCache
 */
module.exports = function createCustomThemeSettingsService({models, customThemeSettingsCache}) {
    return {
        api: new CustomThemeSettingsService({
            model: models.CustomThemeSetting,
            cache: customThemeSettingsCache
        }),
        init() {}
    };
};
