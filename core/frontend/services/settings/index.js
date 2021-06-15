const _ = require('lodash');
const crypto = require('crypto');
const debug = require('@tryghost/debug')('frontend:services:settings:index');
const SettingsLoader = require('./loader');
const ensureSettingsFiles = require('./ensure-settings');

const errors = require('@tryghost/errors');

/**
 * md5 hashes of default settings
 */
const defaultHashes = {
    routes: '3d180d52c663d173a6be791ef411ed01'
};

const calculateHash = (data) => {
    return crypto.createHash('md5')
        .update(data, 'binary')
        .digest('hex');
};

module.exports = {
    init: function () {
        const knownSettings = this.knownSettings();

        debug('init settings service for:', knownSettings);

        // Make sure that supported settings files are available
        // inside of the `content/setting` directory
        return ensureSettingsFiles(knownSettings);
    },

    /**
    * Global place to switch on more available settings.
    */
    knownSettings: function knownSettings() {
        return ['routes'];
    },

    /**
     * Getter for YAML settings.
     * Example: `settings.get('routes').then(...)`
     * will return an Object like this:
     * {routes: {}, collections: {}, resources: {}}
     * @param {String} setting type of supported setting.
     * @returns {Object} settingsFile
     * @description Returns settings object as defined per YAML files in
     * `/content/settings` directory.
     */
    get: function get(setting) {
        const knownSettings = this.knownSettings();

        // CASE: this should be an edge case and only if internal usage of the
        // getter is incorrect.
        if (!setting || _.indexOf(knownSettings, setting) < 0) {
            throw new errors.IncorrectUsageError({
                message: `Requested setting is not supported: '${setting}'.`,
                help: `Please use only the supported settings: ${knownSettings}.`
            });
        }

        return SettingsLoader(setting);
    },

    /**
     * Getter for all YAML settings.
     * Example: `settings.getAll().then(...)`
     * will return an Object like this (assuming we're supporting `routes`
     * and `globals`):
     * {
     *     routes: {
     *         routes: null,
     *         collections: { '/': [Object] },
     *         resources: { tag: '/tag/{slug}/', author: '/author/{slug}/' }
     *     },
     *     globals: {
     *         config: { url: 'testblog.com' }
     *     }
     * }
     * @returns {Object} settingsObject
     * @description Returns all settings object as defined per YAML files in
     * `/content/settings` directory.
     */
    getAll: function getAll() {
        const knownSettings = this.knownSettings();
        const settingsToReturn = {};

        _.each(knownSettings, function (setting) {
            settingsToReturn[setting] = SettingsLoader(setting);
        });

        return settingsToReturn;
    },

    getDefaulHash: (setting) => {
        return defaultHashes[setting];
    },

    getCurrentHash: async (setting) => {
        const data = await SettingsLoader.loadSettings(setting);

        return calculateHash(JSON.stringify(data));
    }
};
