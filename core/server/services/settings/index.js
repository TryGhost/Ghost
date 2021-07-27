/**
 * Settings Lib
 * A collection of utilities for handling settings including a cache
 */
const events = require('../../lib/common/events');
const models = require('../../models');
const SettingsCache = require('../../../shared/settings-cache');

// The string returned when a setting is set as write-only
const obfuscatedSetting = '••••••••';

// The function used to decide whether a setting is write-only
function isSecretSetting(setting) {
    return /secret/.test(setting.key);
}

// The function that obfuscates a write-only setting
function hideValueIfSecret(setting) {
    if (setting.value && isSecretSetting(setting)) {
        return {...setting, value: obfuscatedSetting};
    }
    return setting;
}

module.exports = {
    /**
     * Initialize the cache, used in boot and in testing
     */
    async init() {
        const settingsCollection = await models.Settings.populateDefaults();
        SettingsCache.init(events, settingsCollection);
    },

    /**
     * Shutdown the cache, used in force boot during testing
     */
    shutdown() {
        SettingsCache.reset(events);
    },

    /**
     * Handles synchronization of routes.yaml hash loaded in the frontend with
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
    },

    /**
     * Handles email setting synchronization when email has been verified per instance
     *
     * @param {boolean} configValue current email verification value from local config
     */
    async syncEmailSettings(configValue) {
        const isEmailDisabled = SettingsCache.get('email_verification_required');

        if (configValue === true && isEmailDisabled) {
            return await models.Settings.edit([{
                key: 'email_verification_required',
                value: false
            }], {context: {internal: true}});
        }
    },

    obfuscatedSetting,
    isSecretSetting,
    hideValueIfSecret
};
