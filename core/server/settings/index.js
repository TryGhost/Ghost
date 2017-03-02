/**
 * Settings Lib
 * A collection of utilities for handling settings including a cache
 */

var _ = require('lodash'),
    SettingsModel = require('../models/settings').Settings,
    SettingsCache = require('./cache');

module.exports = {
    init: function init() {
        // Bind to events
        SettingsCache.init();
        // Update the defaults
        return SettingsModel.populateDefaults()
            .then(function (settingsCollection) {
                // Reset the cache
                // PopulateDefaults returns us a bookshelf Collection of Settings Models.
                // We want to iterate over the models, and for each model:
                // Get the key, and the JSON version of the model, and call settingsCache.set()
                // This is identical to the updateSettingFromModel code inside of settings/cache.init()
                _.each(settingsCollection.models, function updateSettingFromModel(settingModel) {
                    SettingsCache.set(settingModel.get('key'), settingModel.toJSON());
                });

                return SettingsCache.getAll();
            });
    }
};
