const logging = require('@tryghost/logging');

/**
 * Resolves the suppression list provider based on email provider configuration
 *
 * Suppression list providers are tied to email providers. If a bulk email provider
 * doesn't have suppression list support, this returns null and a fallback implementation
 * (InMemoryEmailSuppressionList) is used.
 *
 * @param {Object} config - Configuration service
 * @returns {string|null} The suppression provider name or null if unsupported
 */
function resolveSuppressionProvider(config) {
    const emailProvider = config.get('bulkEmail:provider');

    // Only use default for undefined or empty string
    const provider = (emailProvider === undefined || emailProvider === '') ? 'mailgun' : emailProvider;

    // Map email providers to their suppression implementations
    const suppressionProviderMap = {
        mailgun: 'mailgun'
        // Future providers can be added here:
        // 'ses': 'ses',
        // 'sendgrid': 'sendgrid'
    };

    const suppressionProvider = suppressionProviderMap[provider];

    if (!suppressionProvider) {
        logging.warn(`No suppression list provider available for email provider: ${provider}`);
    }

    return suppressionProvider || null;
}

/**
 * Creates suppression list provider instance
 *
 * @param {Object} config - Configuration service
 * @param {Object} settings - Settings cache
 * @param {Object} models - Ghost models
 * @returns {Object} Suppression list provider instance
 */
function createSuppressionProvider(config, settings, models) {
    const provider = resolveSuppressionProvider(config);

    if (provider === 'mailgun') {
        const MailgunClient = require('../lib/MailgunClient');
        const MailgunEmailSuppressionList = require('./MailgunEmailSuppressionList');

        const mailgunClient = new MailgunClient({config, settings});

        return new MailgunEmailSuppressionList({
            Suppression: models.Suppression,
            apiClient: mailgunClient
        });
    }

    // Fallback to in-memory implementation for unsupported providers
    const InMemoryEmailSuppressionList = require('./InMemoryEmailSuppressionList');
    return new InMemoryEmailSuppressionList();
}

module.exports = {
    resolveSuppressionProvider,
    createSuppressionProvider
};