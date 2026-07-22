const config = require('../../../shared/config');
const parseYaml = require('./yaml-parser');
const DynamicRoutingService = require('./dynamic-routing-service');

const service = new DynamicRoutingService();

module.exports = {
    init: async () => {
        const adapterManager = require('../adapter-manager').default;
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
     * Methods backing the Admin API settings endpoint — delegate to the
     * service instance so the endpoint stays decoupled from service wiring.
     */
    api: {
        get upload() {
            return service.upload.bind(service);
        },
        get download() {
            return service.download.bind(service);
        },
        get getCurrentHash() {
            return service.getCurrentHash.bind(service);
        }
    }
};
