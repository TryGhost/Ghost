const CustomThemeSettingsService = require('../../shared/custom-theme-settings-cache/custom-theme-settings-service');
const customThemeSettingsCache = require('../../shared/custom-theme-settings-cache');
const models = require('../models');

class CustomThemeSettingsServiceWrapper {
    init() {
        this.api = new CustomThemeSettingsService({
            model: models.CustomThemeSetting,
            cache: customThemeSettingsCache
        });
    }
}

module.exports = new CustomThemeSettingsServiceWrapper();
