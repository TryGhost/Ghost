const config = require('../../../shared/config');
const parseYaml = require('./yaml-parser');
const SettingsPathManager = require('@tryghost/settings-path-manager');

let settingsLoader;
let routeSettings;

module.exports = {
    init: async () => {
        const RouteSettings = require('./RouteSettings');
        const SettingsLoader = require('./SettingsLoader');
        const DefaultSettingsManager = require('./DefaultSettingsManager');

        const settingsPathManager = new SettingsPathManager({type: 'routes', paths: [config.getContentPath('settings')]});
        settingsLoader = new SettingsLoader({parseYaml, settingFilePath: settingsPathManager.getDefaultFilePath()});
        routeSettings = new RouteSettings({
            settingsLoader,
            settingsPath: settingsPathManager.getDefaultFilePath(),
            backupPath: settingsPathManager.getBackupFilePath()
        });
        const defaultSettingsManager = new DefaultSettingsManager({
            type: 'routes',
            extension: '.yaml',
            destinationFolderPath: config.getContentPath('settings'),
            sourceFolderPath: config.get('paths').defaultRouteSettings
        });

        return await defaultSettingsManager.ensureSettingsFileExists();
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
