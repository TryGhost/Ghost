/**
 * Settings Lib
 * A collection of utilities for handling settings including a cache
 * @TODO: eventually much of this logic will move into this lib
 * For now we are providing a unified interface
 */

var SettingsModel = require('../models/settings').Settings,
    SettingsAPI = require('../api').settings,
    SettingsCache = require('./cache');

module.exports = {
    init: function init() {
        // Bind to events
        SettingsCache.init();
        // Update the defaults
        return SettingsModel.populateDefaults()
            .then(function (allSettings) {
                // Reset the cache
                return SettingsAPI.updateSettingsCache(allSettings);
            });
    }
};
