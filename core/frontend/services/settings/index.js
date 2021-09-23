const crypto = require('crypto');
const SettingsLoader = require('./loader');

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
    /**
     * Getter for routes YAML setting.
     * Example: `settings.get().then(...)`
     * will return a JSON Object like this:
     * {routes: {}, collections: {}, resources: {}}
     * @returns {Object} routes.yaml in JSON format
     */
    get: function get() {
        return SettingsLoader.loadSettingsSync('routes');
    },

    getDefaultHash: () => {
        return defaultRoutesSettingHash;
    },

    getCurrentHash: async () => {
        const data = await SettingsLoader.loadSettings('routes');

        return calculateHash(JSON.stringify(data));
    }
};
