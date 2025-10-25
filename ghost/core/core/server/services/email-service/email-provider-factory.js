const logging = require('@tryghost/logging');

/**
 * Validates and resolves the email provider configuration
 *
 * WARNING: Currently only 'mailgun' is supported. Setting any other value
 * in bulkEmail:provider will cause Ghost to fail at startup.
 *
 * Future providers (ses, sendgrid, postmark) will be added in upcoming releases.
 * DO NOT change this setting unless you're developing/testing new providers.
 *
 * @param {Object} config - Configuration service
 * @returns {string} The provider name
 * @throws {Error} If provider is not 'mailgun'
 */
function resolveEmailProvider(config) {
    const provider = config.get('bulkEmail:provider') || 'mailgun';

    if (provider !== 'mailgun') {
        throw new Error(`Unknown bulk email provider: ${provider}. Only 'mailgun' is currently supported.`);
    }

    return provider;
}

/**
 * Creates the email provider instance based on configuration
 *
 * @param {Object} config - Configuration service
 * @param {Object} settings - Settings cache
 * @param {Object} sentry - Sentry error tracking service
 * @returns {MailgunEmailProvider} Email provider instance
 * @throws {Error} If provider is not 'mailgun'
 */
function createEmailProvider(config, settings, sentry) {
    const provider = resolveEmailProvider(config);

    if (provider === 'mailgun') {
        const MailgunClient = require('../lib/MailgunClient');
        const MailgunEmailProvider = require('./MailgunEmailProvider');

        // capture errors from mailgun client and log them in sentry
        const errorHandler = (error) => {
            logging.info(`Capturing error for mailgun email provider service`);
            sentry.captureException(error);
        };

        const mailgunClient = new MailgunClient({config, settings});

        return new MailgunEmailProvider({
            mailgunClient,
            errorHandler
        });
    }

    // This should never be reached due to validation, but keeping for safety
    throw new Error(`Provider '${provider}' is not implemented`);
}

module.exports = {
    resolveEmailProvider,
    createEmailProvider
};