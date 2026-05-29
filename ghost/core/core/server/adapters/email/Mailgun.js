const EmailProviderBase = require('./EmailProviderBase');
const MailgunEmailProvider = require('../../services/email-service/mailgun-email-provider');
const EmailAnalyticsProviderMailgun = require('../../services/email-analytics/email-analytics-provider-mailgun');
const MailgunClient = require('../../services/lib/mailgun-client');

/**
 * Mailgun Email Adapter
 *
 * Thin wrapper around existing MailgunEmailProvider and EmailAnalyticsProviderMailgun
 * to conform to the unified adapter pattern.
 *
 * @extends EmailProviderBase
 */
class Mailgun extends EmailProviderBase {
    #emailProvider;
    #analyticsProvider;

    /**
     * @param {Object} config - Adapter configuration
     * @param {Object} config.configService - Ghost config service
     * @param {Object} config.settingsCache - Ghost settings cache
     * @param {Object} config.labs - Ghost labs service
     * @param {Function} [config.errorHandler] - Custom error handler
     */
    constructor(config) {
        super(config);

        const {configService, settingsCache, labs, errorHandler} = config;

        // Initialize Mailgun client (shared between email and analytics)
        const mailgunClient = new MailgunClient({
            config: configService,
            settings: settingsCache,
            labs
        });

        // Initialize the existing email provider
        this.#emailProvider = new MailgunEmailProvider({
            mailgunClient,
            errorHandler
        });

        // Initialize the existing analytics provider
        this.#analyticsProvider = new EmailAnalyticsProviderMailgun({
            config: configService,
            settings: settingsCache,
            labs
        });
    }

    /**
     * Send an email (delegates to existing MailgunEmailProvider)
     */
    async send(data, options) {
        return await this.#emailProvider.send(data, options);
    }

    /**
     * Get maximum recipients per batch (delegates to existing MailgunEmailProvider)
     */
    getMaximumRecipients() {
        return this.#emailProvider.getMaximumRecipients();
    }

    /**
     * Get target delivery window (delegates to existing MailgunEmailProvider)
     */
    getTargetDeliveryWindow() {
        return this.#emailProvider.getTargetDeliveryWindow();
    }

    /**
     * Fetch latest email events for analytics (delegates to existing EmailAnalyticsProviderMailgun)
     */
    async fetchLatest(batchHandler, options) {
        return await this.#analyticsProvider.fetchLatest(batchHandler, options);
    }
}

module.exports = Mailgun;
