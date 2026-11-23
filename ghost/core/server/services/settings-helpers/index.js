const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils').default;
const config = require('../../../shared/config');
const SettingsHelpers = require('./settings-helpers');
const labs = require('../../../shared/labs');
const limits = require('../../../../shared/limits').default;

// Built on import, before services can be built, and kept across a restart of Ghost in one
// process: the limits are read when a helper asks, not kept.
const limitService = { isDisabled: (name) => limits.service.isDisabled(name) };

module.exports = new SettingsHelpers({ settingsCache, urlUtils, config, labs, limitService });
