/**
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

    return adapterServiceConfig;
};
