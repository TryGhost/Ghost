/**
 * Settings Lib
 * A collection of utilities for handling settings including a cache
 */

var SettingsModel = require('../models/settings').Settings,
    SettingsCache = require('./cache');

module.exports = {
    init: function init() {
        // Update the defaults
        return SettingsModel.populateDefaults()
            .then(function (settingsCollection) {
                // Initialise the cache with the result
                // This will bind to events for further updates
                SettingsCache.init(settingsCollection);
            });
    }
};
