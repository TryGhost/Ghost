/**
 * Settings Lib
 * A collection of utilities for handling settings including a cache
 */
const models = require('../../models');
const SettingsCache = require('./cache');

module.exports = {
    async init() {
        const settingsCollection = await models.Settings.populateDefaults();
        SettingsCache.init(settingsCollection);
    },

    async reinit() {
        SettingsCache.shutdown();
        const settingsCollection = await models.Settings.populateDefaults();
        SettingsCache.init(settingsCollection);
        for (const model of settingsCollection.models) {
            model.emitChange(model.attributes.key + '.' + 'edited', {});
        }
    }
};
