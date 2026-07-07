const createFacade = require('../../../shared/container/create-facade');
const createCustomThemeSettingsService = require('./create');

module.exports = createFacade('customThemeSettings', () => createCustomThemeSettingsService({
    models: require('../../models'),
    customThemeSettingsCache: require('../../../shared/custom-theme-settings-cache')
}));
