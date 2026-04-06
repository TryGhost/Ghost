const AdapterManager = require('./adapter-manager');
const getAdapterServiceConfig = require('./config');
const resolveAdapterOptions = require('./options-resolver');
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
adapterManager.registerAdapter('scheduling', require('../../adapters/scheduling/scheduling-base'));
adapterManager.registerAdapter('sso', require('../../adapters/sso/SSOBase'));
adapterManager.registerAdapter('cache', require('@tryghost/adapter-base-cache'));

module.exports = {
    /**
     *
     * @param {String} name - one of 'storage', 'scheduling', 'sso', 'cache' etc. Or can contain a "resource" extension like "storage:image"
     * @returns {Object} instance of an adapter
     */
    getAdapter(name) {
        const adapterServiceConfig = getAdapterServiceConfig(config);

        const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        return adapterManager.getAdapter(name, adapterClassName, adapterConfig);
    },

    /**
     * Force recreation of all instances instead of reusing cached instances. Use when editing config file during tests.
     */
    clearCache() {
        adapterManager.clearInstanceCache();
    }
};
