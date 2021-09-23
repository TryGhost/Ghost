const {Service: CustomThemeSettingsService} = require('@tryghost/custom-theme-settings-service');
const customThemeSettingsCache = require('../../shared/custom-theme-settings-cache');
const models = require('../models');

module.exports = new CustomThemeSettingsService({
    model: models.CustomThemeSetting,
    cache: customThemeSettingsCache
});
