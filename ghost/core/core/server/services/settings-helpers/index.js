const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils').default;
const config = require('../../../shared/config');
const SettingsHelpers = require('./settings-helpers');
const labs = require('../../../shared/labs');
const { service: limitService } = require('../limits');

module.exports = new SettingsHelpers({ settingsCache, urlUtils, config, labs, limitService });
