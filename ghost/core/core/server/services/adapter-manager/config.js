/**
 * Maps configuration from the config file to a unified adapter config in following form:
 * {
 *   [adapterType]: {
 *     active: [adapterName],
 *     [adapterName]: {}
 *   }
 * }
 */
module.exports = function getAdapterServiceConfig(config) {
    const adapterServiceConfig = config.get('adapters');

    if (!adapterServiceConfig.storage) {
        adapterServiceConfig.storage = config.get('storage');
    }

    if (!adapterServiceConfig.scheduling) {
        const schedulingConfig = config.get('scheduling');
        const activeSchedulingAdapter = schedulingConfig.active;
        adapterServiceConfig.scheduling = {
            active: activeSchedulingAdapter,
            [activeSchedulingAdapter]: {
                schedulerUrl: schedulingConfig.schedulerUrl
            }
        };
    }

    // FileStore needs Ghost's resolved content path, which isn't
    // representable as a static value in defaults.json.
    if (adapterServiceConfig.redirects?.FileStore) {
        adapterServiceConfig.redirects.FileStore.basePath ||= config.getContentPath('data');
    }

    if (adapterServiceConfig['route-settings']?.FileStore) {
        // Resolve into fresh objects rather than mutating the stored config:
        // config.get('adapters') returns a live reference, so a `||=` here
        // would bake the first caller's content path into the singleton and
        // ignore later contentPath changes (test boots swap it per instance).
        const fileStoreConfig = adapterServiceConfig['route-settings'].FileStore;
        return {
            ...adapterServiceConfig,
            'route-settings': {
                ...adapterServiceConfig['route-settings'],
                FileStore: {
                    ...fileStoreConfig,
                    basePath: fileStoreConfig.basePath || config.getContentPath('settings'),
                    defaultSettingsBasePath: fileStoreConfig.defaultSettingsBasePath || config.get('paths').defaultRouteSettings
                }
            }
        };
    }

    return adapterServiceConfig;
};
