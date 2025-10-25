const AdapterManager = require('./AdapterManager');
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
adapterManager.registerAdapter('email', require('../../adapters/email/EmailProviderBase'));
adapterManager.registerAdapter('email-analytics', require('../../adapters/email-analytics/EmailAnalyticsBase'));
adapterManager.registerAdapter('email-suppression', require('../../adapters/email-suppression/EmailSuppressionBase'));

module.exports = {
    /**
     *
     * @param {String} name - one of 'storage', 'scheduling', 'sso', 'cache', 'email', 'email-analytics', 'email-suppression' etc. Or can contain a "resource" extension like "storage:image"
     * @param {Object} [runtimeConfig] - Optional runtime configuration to merge with file-based config (e.g., for dependency injection)
     * @returns {Object} instance of an adapter
     */
    getAdapter(name, runtimeConfig) {
        const adapterServiceConfig = getAdapterServiceConfig(config);

        const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        // Merge runtime config with file-based config
        // Runtime config takes precedence for dependency injection (e.g., mailgunClient instance)
        const finalConfig = runtimeConfig ? Object.assign({}, adapterConfig, runtimeConfig) : adapterConfig;

        // When runtime config is provided, clear cache to ensure fresh instance with new dependencies
        // This prevents cached instances from being returned with stale runtime dependencies
        if (runtimeConfig) {
            const adapterType = name.includes(':') ? name.split(':')[0] : name;
            adapterManager.resetCacheFor(adapterType);
        }

        return adapterManager.getAdapter(name, adapterClassName, finalConfig);
    },

    /**
     * Force recreation of all instances instead of reusing cached instances. Use when editing config file during tests.
     */
    clearCache() {
        adapterManager.clearInstanceCache();
    },

    /**
     * Clear cached instances for a specific adapter type
     *
     * @param {String} adapterType - The adapter type to clear cache for (e.g., 'email', 'email-analytics')
     */
    resetCacheFor(adapterType) {
        adapterManager.resetCacheFor(adapterType);
    }
};
