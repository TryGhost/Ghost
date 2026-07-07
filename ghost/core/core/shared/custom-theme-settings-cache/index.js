const createFacade = require('../container/create-facade');
const CustomThemeSettingsCache = require('./custom-theme-settings-cache');

module.exports = createFacade('customThemeSettingsCache', () => new CustomThemeSettingsCache());
