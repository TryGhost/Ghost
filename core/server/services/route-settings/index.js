const RouteSettings = require('./route-settings');
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

const settingsLoader = new SettingsLoader({
    parseYaml,
    storageFolderPath: config.getContentPath('settings')
});

const routeSettings = new RouteSettings();

module.exports = {
    init: async () => {
        return await defaultSettingsManager.ensureSettingsFileExists();
    },

    loadRouteSettingsSync: settingsLoader.loadSettingsSync.bind(settingsLoader),
    loadRouteSettings: settingsLoader.loadSettings.bind(settingsLoader),
    getDefaultHash: routeSettings.getDefaultHash.bind(routeSettings),
    /**
     * Methods used in the API
     */
    api: {
        setFromFilePath: routeSettings.setFromFilePath.bind(routeSettings),
        get: routeSettings.get.bind(routeSettings),
        getCurrentHash: routeSettings.getCurrentHash.bind(routeSettings)
    }
};
