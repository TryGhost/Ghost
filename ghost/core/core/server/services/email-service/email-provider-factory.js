const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

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
 * @throws {IncorrectUsageError} If provider is not 'mailgun'
 */
function resolveEmailProvider(config) {
    const emailProvider = config.get('bulkEmail:provider');

    // Only use default for undefined or empty string
    const provider = (emailProvider === undefined || emailProvider === '') ? 'mailgun' : emailProvider;

    if (provider !== 'mailgun') {
        throw new errors.IncorrectUsageError({
            message: `Unknown bulk email provider: ${provider}. Only 'mailgun' is currently supported.`
        });
    }

    return provider;
}

/**
 * Creates the email provider instance based on configuration
 *
 * @param {Object} config - Configuration service
 * @param {Object} settings - Settings cache
 * @param {Object} sentry - Sentry error tracking service
 * @returns {Object} Email provider instance
 * @throws {IncorrectUsageError|InternalServerError} If provider is invalid or not implemented
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
    throw new errors.InternalServerError({
        message: `Provider '${provider}' is not implemented`
    });
}

module.exports = {
    resolveEmailProvider,
    createEmailProvider
};