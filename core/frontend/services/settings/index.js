const crypto = require('crypto');
const debug = require('@tryghost/debug')('frontend:services:settings:index');
const SettingsLoader = require('./loader');
const ensureSettingsFile = require('./ensure-settings');

/**
 * md5 hashes of default routes settings
 */
const defaultRoutesSettingHash = '3d180d52c663d173a6be791ef411ed01';

const calculateHash = (data) => {
    return crypto.createHash('md5')
        .update(data, 'binary')
        .digest('hex');
};

module.exports = {
    init: function () {
        debug('init routes settings service');

        // Make sure that supported settings files are available
        // inside of the `content/setting` directory
        return ensureSettingsFile('routes.yaml');
    },

    /**
     * Getter for routes YAML setting.
     * Example: `settings.get().then(...)`
     * will return a JSON Object like this:
     * {routes: {}, collections: {}, resources: {}}
     * @returns {Object} routes.yaml in JSON format
     */
    get: function get() {
        return SettingsLoader('routes');
    },

    getDefaultHash: () => {
        return defaultRoutesSettingHash;
    },

    getCurrentHash: async (setting) => {
        const data = await SettingsLoader.loadSettings(setting);

        return calculateHash(JSON.stringify(data));
    }
};
