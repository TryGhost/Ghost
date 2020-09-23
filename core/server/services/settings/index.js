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
        const oldSettings = SettingsCache.getAll();

        SettingsCache.shutdown();
        const settingsCollection = await models.Settings.populateDefaults();
        const newSettings = SettingsCache.init(settingsCollection);

        for (const model of settingsCollection.models) {
            const key = model.attributes.key;

            // The type of setting is object. That's why we need to compare the value of the `value` property.
            if (newSettings[key].value !== oldSettings[key].value) {
                model.emitChange(key + '.' + 'edited', {});
            }
        }
    },

    /**
     * Handles syncronization of routes.yaml hash loaded in the frontend with
     * the value stored in the settings table.
     * getRoutesHash is a function to allow keeping "frontend" decoupled from settings
     *
     * @param {function} getRoutesHash function fetching currently loaded routes file hash
     */
    async syncRoutesHash(getRoutesHash) {
        const currentRoutesHash = await getRoutesHash();

        if (SettingsCache.get('routes_hash') !== currentRoutesHash) {
            return await models.Settings.edit([{
                key: 'routes_hash',
                value: currentRoutesHash
            }], {context: {internal: true}});
        }
    }
};
