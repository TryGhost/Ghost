const logging = require('@tryghost/logging');

/**
 * Resolves the analytics provider based on email provider configuration
 *
 * Analytics providers are tied to email providers. If a bulk email provider
 * doesn't have analytics support, this returns null and analytics features
 * are disabled for that provider.
 *
 * @param {Object} config - Configuration service
 * @returns {string|null} The analytics provider name or null if unsupported
 */
function resolveAnalyticsProvider(config) {
    const emailProvider = config.get('bulkEmail:provider');

    // Only use default for undefined or empty string
    const provider = (emailProvider === undefined || emailProvider === '') ? 'mailgun' : emailProvider;

    // Map email providers to their analytics implementations
    const analyticsProviderMap = {
        mailgun: 'mailgun'
        // Future providers can be added here:
        // 'ses': 'ses',
        // 'sendgrid': 'sendgrid'
    };

    const analyticsProvider = analyticsProviderMap[provider];

    if (!analyticsProvider) {
        logging.warn(`No analytics provider available for email provider: ${provider}`);
    }

    return analyticsProvider || null;
}

/**
 * Creates analytics providers array for the EmailAnalyticsService
 *
 * @param {Object} config - Configuration service
 * @param {Object} settings - Settings cache
 * @returns {Array} Array of analytics provider instances
 */
function createAnalyticsProviders(config, settings) {
    const provider = resolveAnalyticsProvider(config);

    if (!provider) {
        // Return empty array - analytics will be disabled
        return [];
    }

    if (provider === 'mailgun') {
        const MailgunProvider = require('./EmailAnalyticsProviderMailgun');
        return [
            new MailgunProvider({config, settings})
        ];
    }

    // This should never be reached due to validation, but keeping for safety
    logging.error(`Analytics provider '${provider}' is not implemented`);
    return [];
}

module.exports = {
    resolveAnalyticsProvider,
    createAnalyticsProviders
};