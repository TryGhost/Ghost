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

    return adapterServiceConfig;
};
