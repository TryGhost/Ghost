const config = require('../../../shared/config');
const parseYaml = require('./yaml-parser');
const DynamicRoutingService = require('./dynamic-routing-service');

const service = new DynamicRoutingService();

module.exports = {
    init: async () => {
        const adapterManager = require('../adapter-manager');
        const SettingsLoader = require('./settings-loader');
        const SettingsPathManager = require('./settings-path-manager');

        const settingsPathManager = new SettingsPathManager({type: 'routes', paths: [config.getContentPath('settings')]});
        const settingsLoader = new SettingsLoader({parseYaml, settingFilePath: settingsPathManager.getDefaultFilePath()});

        service.configure({
            store: adapterManager.getAdapter('route-settings'),
            settingsLoader
        });
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
