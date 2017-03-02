/**
 * Settings Lib
 * A collection of utilities for handling settings including a cache
 */

var SettingsModel = require('../models/settings').Settings,
    SettingsCache = require('./cache');

module.exports = {
    init: function init() {
        // Bind to events

        // Update the defaults
        return SettingsModel.populateDefaults()
            .then(function (settingsCollection) {
                SettingsCache.init(settingsCollection);
            });
    }
};
