/**
 * Settings Lib
 * A collection of utilities for handling settings including a cache
 */
const models = require('../../models');
const SettingsCache = require('./cache');

module.exports = {
    init: function init() {
        // Update the defaults
        return models.Settings.populateDefaults()
            .then((settingsCollection) => {
                // Initialise the cache with the result
                // This will bind to events for further updates
                SettingsCache.init(settingsCollection);
            });
    }
};
