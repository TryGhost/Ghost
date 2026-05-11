const logging = require('@tryghost/logging');
const MailgunClient = require('../lib/mailgun-client');
const ResendClient = require('../lib/resend-client');
const MailgunEmailProvider = require('./mailgun-email-provider');
const ResendEmailProvider = require('./resend-email-provider');

/**
 * Resolve which bulk-email provider should be used.
 *
 * Resolution order:
 *   1. Explicit `config.bulkEmail.provider` value ('mailgun' or 'resend').
 *   2. If `config.bulkEmail.resend` block is set → 'resend'.
 *   3. If a non-empty `resend_api_key` setting is stored → 'resend'.
 *   4. If `config.bulkEmail.mailgun` block is set → 'mailgun'.
 *   5. If Mailgun api key + domain settings are stored → 'mailgun'.
 *   6. Default 'mailgun' (preserves upstream behaviour).
 *
 * @param {object} config
 * @param {object} settings - settings cache
 * @returns {'mailgun'|'resend'}
 */
function resolveProvider(config, settings) {
    const bulkEmailConfig = config.get('bulkEmail') || {};
    const explicit = bulkEmailConfig.provider;
    if (explicit === 'resend' || explicit === 'mailgun') {
        return explicit;
    }

    const hasResendConfig = !!bulkEmailConfig.resend;
    const hasResendSetting = !!settings.get('resend_api_key');
    if (hasResendConfig || hasResendSetting) {
        return 'resend';
    }

    const hasMailgunConfig = !!bulkEmailConfig.mailgun;
    const hasMailgunSetting = !!(settings.get('mailgun_api_key') && settings.get('mailgun_domain'));
    if (hasMailgunConfig || hasMailgunSetting) {
        return 'mailgun';
    }

    return 'mailgun';
}

/**
 * Build the bulk-email client + provider pair for the active provider.
 *
 * @param {object} deps
 * @param {object} deps.config
 * @param {object} deps.settings - settings cache
 * @param {Function} [deps.errorHandler]
 * @returns {{provider: 'mailgun'|'resend', client: object, emailProvider: object}}
 */
function createBulkEmailProvider({config, settings, errorHandler}) {
    const provider = resolveProvider(config, settings);
    logging.info(`[BulkEmail] Using provider: ${provider}`);

    if (provider === 'resend') {
        const client = new ResendClient({config, settings});
        const emailProvider = new ResendEmailProvider({resendClient: client, errorHandler});
        return {provider, client, emailProvider};
    }

    const client = new MailgunClient({config, settings});
    const emailProvider = new MailgunEmailProvider({mailgunClient: client, errorHandler});
    return {provider, client, emailProvider};
}

module.exports = {
    resolveProvider,
    createBulkEmailProvider
};
