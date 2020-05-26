const AdapterManager = require('@tryghost/adapter-manager');
const getAdapterServiceConfig = require('./config');
const config = require('../../../shared/config');

const adapterManager = new AdapterManager({
    loadAdapterFromPath: require,
    pathsToAdapters: [
        '', // A blank path will cause us to check node_modules for the adapter
        config.getContentPath('adapters'),
        config.get('paths').internalAdaptersPath
    ]
});

adapterManager.registerAdapter('storage', require('ghost-storage-base'));
adapterManager.registerAdapter('scheduling', require('../../adapters/scheduling/SchedulingBase'));
adapterManager.registerAdapter('sso', require('../../adapters/sso/Base'));

module.exports = {
    getAdapter(adapterType) {
        const adapterServiceConfig = getAdapterServiceConfig(config);

        const adapterSettings = adapterServiceConfig[adapterType];
        const activeAdapter = adapterSettings.active;
        const activeAdapterConfig = adapterSettings[activeAdapter];

        return adapterManager.getAdapter(adapterType, activeAdapter, activeAdapterConfig);
    }
};
