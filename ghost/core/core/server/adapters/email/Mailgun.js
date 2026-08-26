const EmailProviderBase = require('./EmailProviderBase');
const MailgunEmailProvider = require('../../services/email-service/mailgun-email-provider');
const {fetchMailgunEvents} = require('../../services/email-analytics/fetch-mailgun-events');
const MailgunClient = require('../../services/lib/mailgun-client');
const errors = require('@tryghost/errors');

/**
 * Mailgun Email Adapter
 *
 * Thin wrapper around existing MailgunEmailProvider and fetchMailgunEvents
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
     * @param {string[]} [config.tags] - Mailgun tags scoping which events analytics fetches
     * @param {Object} [config.emailProvider] - Pre-built email provider (primarily for testing)
     * @param {Object} [config.analyticsProvider] - Pre-built analytics provider (primarily for testing)
     */
    constructor(config = {}) {
        super(config);

        const {configService, settingsCache, labs, errorHandler, emailProvider, analyticsProvider, tags} = config;

        // Only initialize providers if we have the required dependencies
        if (configService && settingsCache) {
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

            // Initialize the analytics provider on top of the shared
            // fetchMailgunEvents helper. `tags` scopes which Mailgun events
            // are fetched (e.g. newsletters vs automations).
            this.#analyticsProvider = {
                fetchLatest: (batchHandler, fetchOptions = {}) => fetchMailgunEvents({
                    config: configService,
                    settings: settingsCache,
                    tags,
                    batchHandler,
                    maxEvents: fetchOptions.maxEvents,
                    begin: fetchOptions.begin,
                    end: fetchOptions.end,
                    events: fetchOptions.events
                })
            };
        }

        // Allow explicit provider injection, which overrides the auto-built
        // providers above. Used to supply test doubles for the private fields.
        if (emailProvider) {
            this.#emailProvider = emailProvider;
        }
        if (analyticsProvider) {
            this.#analyticsProvider = analyticsProvider;
        }
    }

    /**
     * Getter for required functions (ensures adapter validation passes)
     */
    get requiredFns() {
        return EmailProviderBase.requiredFns;
    }

    /**
     * Send an email (delegates to existing MailgunEmailProvider)
     */
    async send(data, options) {
        if (!this.#emailProvider) {
            throw new errors.IncorrectUsageError({
                message: 'Mailgun adapter not initialized. Please provide configService and settingsCache.'
            });
        }
        return await this.#emailProvider.send(data, options);
    }

    /**
     * Get maximum recipients per batch (delegates to existing MailgunEmailProvider)
     */
    getMaximumRecipients() {
        if (!this.#emailProvider) {
            throw new errors.IncorrectUsageError({
                message: 'Mailgun adapter not initialized. Please provide configService and settingsCache.'
            });
        }
        return this.#emailProvider.getMaximumRecipients();
    }

    /**
     * Get target delivery window (delegates to existing MailgunEmailProvider)
     */
    getTargetDeliveryWindow() {
        if (!this.#emailProvider) {
            throw new errors.IncorrectUsageError({
                message: 'Mailgun adapter not initialized. Please provide configService and settingsCache.'
            });
        }
        return this.#emailProvider.getTargetDeliveryWindow();
    }

    /**
     * Fetch latest email events for analytics (delegates to fetchMailgunEvents)
     */
    async fetchLatest(batchHandler, options) {
        if (!this.#analyticsProvider) {
            throw new errors.IncorrectUsageError({
                message: 'Mailgun adapter not initialized. Please provide configService and settingsCache.'
            });
        }
        return await this.#analyticsProvider.fetchLatest(batchHandler, options);
    }
}

module.exports = Mailgun;
