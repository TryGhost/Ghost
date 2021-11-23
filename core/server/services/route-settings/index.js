const config = require('../../../shared/config');
const parseYaml = require('./yaml-parser');

let settingsLoader;
let routeSettings;

module.exports = {
    init: async () => {
        const RouteSettings = require('./route-settings');
        const SettingsLoader = require('./settings-loader');
        const DefaultSettingsManager = require('./default-settings-manager');

        routeSettings = new RouteSettings();

        const defaultSettingsManager = new DefaultSettingsManager({
            type: 'routes',
            extension: '.yaml',
            destinationFolderPath: config.getContentPath('settings'),
            sourceFolderPath: config.get('paths').defaultSettings
        });

        settingsLoader = new SettingsLoader({
            parseYaml,
            storageFolderPath: config.getContentPath('settings')
        });

        return await defaultSettingsManager.ensureSettingsFileExists();
    },

    get loadRouteSettingsSync() {
        return settingsLoader.loadSettingsSync.bind(settingsLoader);
    },
    get loadRouteSettings() {
        return settingsLoader.loadSettings.bind(settingsLoader);
    },
    get getDefaultHash() {
        return routeSettings.getDefaultHash.bind(routeSettings);
    },

    /**
     * Methods used in the API
     */
    api: {
        get setFromFilePath() {
            return routeSettings.setFromFilePath.bind(routeSettings);
        },
        get get() {
            return routeSettings.get.bind(routeSettings);
        },
        get getCurrentHash() {
            return routeSettings.getCurrentHash.bind(routeSettings);
        }
    }
};
