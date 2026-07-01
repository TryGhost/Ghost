const config = require('../../../shared/config');
const parseYaml = require('./yaml-parser');
const DynamicRoutingService = require('./dynamic-routing-service');

const service = new DynamicRoutingService();

module.exports = {
    init: async () => {
        const RouteSettings = require('./route-settings');
        const SettingsLoader = require('./settings-loader');
        const DefaultSettingsManager = require('./default-settings-manager');
        const SettingsPathManager = require('./settings-path-manager');

        const settingsPathManager = new SettingsPathManager({type: 'routes', paths: [config.getContentPath('settings')]});
        const settingsLoader = new SettingsLoader({parseYaml, settingFilePath: settingsPathManager.getDefaultFilePath()});
        const routeSettings = new RouteSettings({
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

        service.configure({settingsLoader, routeSettings});

        await defaultSettingsManager.ensureSettingsFileExists();
    },

    get service() {
        return service;
    },

    get loadRouteSettings() {
        return service.loadRouteSettings.bind(service);
    },

    get getDefaultHash() {
        return service.getDefaultHash.bind(service);
    },

    /**
     * Methods used in the API — delegate to the service instance so the
     * legacy callers keep working without any changes.
     */
    api: {
        get setFromFilePath() {
            return service.setFromFilePath.bind(service);
        },
        get get() {
            return service.get.bind(service);
        },
        get getCurrentHash() {
            return service.getCurrentHash.bind(service);
        }
    }
};
