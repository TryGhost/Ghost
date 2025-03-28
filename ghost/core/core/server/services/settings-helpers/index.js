const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const config = require('../../../shared/config');
const SettingsHelpers = require('./SettingsHelpers');
const labs = require('../../../shared/labs');

module.exports = new SettingsHelpers({settingsCache, urlUtils, config, labs});
