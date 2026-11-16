const config = require('../../../../shared/config');
const withDomainSettings = require('./with-domain-settings');

const defaultSettingsPath = config.get('paths').defaultSettings;

module.exports = withDomainSettings(require(defaultSettingsPath));
