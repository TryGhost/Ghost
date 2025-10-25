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

    // Email adapter config defaults to mailgun
    // Runtime config (like mailgunClient instance) will be injected by EmailServiceWrapper
    if (!adapterServiceConfig.email) {
        adapterServiceConfig.email = {
            active: 'mailgun',
            mailgun: {}
        };
    }

    // Email analytics adapter config defaults to mailgun
    // Runtime config (config and settings) will be injected by EmailAnalyticsServiceWrapper
    if (!adapterServiceConfig['email-analytics']) {
        adapterServiceConfig['email-analytics'] = {
            active: 'mailgun',
            mailgun: {}
        };
    }

    // Email suppression adapter config defaults to mailgun
    // Runtime config (apiClient) will be injected by EmailSuppressionServiceWrapper
    if (!adapterServiceConfig['email-suppression']) {
        adapterServiceConfig['email-suppression'] = {
            active: 'mailgun',
            mailgun: {}
        };
    }

    return adapterServiceConfig;
};
