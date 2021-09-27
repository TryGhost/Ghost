const crypto = require('crypto');
const SettingsLoader = require('../../../server/services/route-settings/loader');

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
    getDefaultHash: () => {
        return defaultRoutesSettingHash;
    },

    getCurrentHash: async () => {
        const data = await SettingsLoader.loadSettings();

        return calculateHash(JSON.stringify(data));
    }
};
