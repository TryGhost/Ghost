const routeSettings = require('./route-settings');
const SettingsLoader = require('./loader');
const config = require('../../../shared/config');
const DefaultSettingsManager = require('./default-settings-manager');

const defaultSettingsManager = new DefaultSettingsManager({
    type: 'routes',
    extension: '.yaml',
    destinationFolderPath: config.getContentPath('settings'),
    sourceFolderPath: config.get('paths').defaultSettings
});

module.exports = {
    init: async () => {
        return await defaultSettingsManager.ensureSettingsFileExists();
    },

    loadRouteSettingsSync: SettingsLoader.loadSettingsSync,
    loadRouteSettings: SettingsLoader.loadSettings,
    getDefaultHash: routeSettings.getDefaultHash,
    /**
     * Methods used in the API
     */
    api: {
        setFromFilePath: routeSettings.setFromFilePath,
        get: routeSettings.get,
        getCurrentHash: routeSettings.getCurrentHash
    }
};
