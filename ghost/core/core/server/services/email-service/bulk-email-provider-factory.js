const logging = require('@tryghost/logging');
const MailgunClient = require('../lib/mailgun-client');
const ResendClient = require('../lib/resend-client');
const MailgunEmailProvider = require('./mailgun-email-provider');
const ResendEmailProvider = require('./resend-email-provider');

/**
 * Resolve which bulk-email provider should be used.
 *
 * Resolution order:
 *   1. Explicit `config.bulkEmail.provider` — honored only if the matching
 *      credentials are present. If the operator selects a provider with no
 *      key, a warning is logged and resolution falls through to auto-detect.
 *   2. If `config.bulkEmail.resend` block is set or `resend_api_key` setting
 *      is stored → 'resend'.
 *   3. Otherwise → 'mailgun' (preserves upstream behaviour).
 *
 * @param {object} config
 * @param {object} settings - settings cache
 * @returns {'mailgun'|'resend'}
 */
function resolveProvider(config, settings) {
    const bulkEmailConfig = config.get('bulkEmail') || {};
    const hasResendCreds = !!(bulkEmailConfig.resend?.apiKey || settings.get('resend_api_key'));
    const hasMailgunCreds = !!(bulkEmailConfig.mailgun || (settings.get('mailgun_api_key') && settings.get('mailgun_domain')));

    const explicit = bulkEmailConfig.provider;
    if (explicit === 'resend' || explicit === 'mailgun') {
        const explicitHasCreds = explicit === 'resend' ? hasResendCreds : hasMailgunCreds;
        if (explicitHasCreds) {
            return explicit;
        }
        logging.warn(`[BulkEmail] bulkEmail.provider="${explicit}" but no ${explicit} credentials configured — falling back to auto-detect`);
    }

    if (hasResendCreds) {
        return 'resend';
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
