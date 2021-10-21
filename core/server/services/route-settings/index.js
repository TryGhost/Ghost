const routeSettings = require('./route-settings');
const SettingsLoader = require('./settings-loader');
const config = require('../../../shared/config');
const parseYaml = require('./yaml-parser');
const DefaultSettingsManager = require('./default-settings-manager');

const defaultSettingsManager = new DefaultSettingsManager({
    type: 'routes',
    extension: '.yaml',
    destinationFolderPath: config.getContentPath('settings'),
    sourceFolderPath: config.get('paths').defaultSettings
});

const settingsLoader = new SettingsLoader({parseYaml});

module.exports = {
    init: async () => {
        return await defaultSettingsManager.ensureSettingsFileExists();
    },

    loadRouteSettingsSync: settingsLoader.loadSettingsSync.bind(settingsLoader),
    loadRouteSettings: settingsLoader.loadSettings.bind(settingsLoader),
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
