const config = require('../../../../shared/config');

const defaultSettingsPath = config.get('paths').defaultSettings;
const defaultSettings = require(defaultSettingsPath);

module.exports = defaultSettings;
