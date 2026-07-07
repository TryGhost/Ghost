const SettingsHelpers = require('./settings-helpers');

/**
 * @param {object} deps
 * @param {object} deps.settingsCache
 * @param {object} deps.urlUtils
 * @param {{get: (key: string) => unknown}} deps.configView
 * @param {object} deps.labs
 * @param {object} deps.limits
 */
module.exports = function createSettingsHelpers({settingsCache, urlUtils, configView, labs, limits}) {
    return new SettingsHelpers({
        settingsCache,
        urlUtils,
        config: configView,
        labs,
        limitService: limits
    });
};
