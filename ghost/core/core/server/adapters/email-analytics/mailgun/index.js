/* eslint-disable ghost/filenames/match-exported-class */
// Filename must be index.js for adapter module resolution (email-analytics/mailgun → email-analytics/mailgun/index.js)
const EmailAnalyticsBase = require('../EmailAnalyticsBase');
const MailgunClient = require('../../../services/lib/MailgunClient');
const errors = require('@tryghost/errors');

const DEFAULT_EVENT_FILTER = 'delivered OR opened OR failed OR unsubscribed OR complained';
const PAGE_LIMIT = 300;
const DEFAULT_TAGS = ['bulk-email'];

/**
 * Mailgun Email Analytics Adapter
 *
 * Fetches email events from Mailgun's analytics API.
 * Extends EmailAnalyticsBase to work with Ghost's AdapterManager.
 */
class MailgunEmailAnalyticsProvider extends EmailAnalyticsBase {
    #mailgunClient;
    #tags;

    /**
     * @param {Object} config - Adapter configuration
     * @param {Object} config.config - Ghost config service
     * @param {Object} config.settings - Ghost settings cache
     */
    constructor(config) {
        super(config);

        if (!config.config || !config.settings) {
            throw new errors.IncorrectUsageError({
                message: 'Mailgun analytics adapter requires config and settings'
            });
        }

        this.#mailgunClient = new MailgunClient({
            config: config.config,
            settings: config.settings
        });

        this.#tags = [...DEFAULT_TAGS];

        if (config.config.get('bulkEmail:mailgun:tag')) {
            this.#tags.push(config.config.get('bulkEmail:mailgun:tag'));
        }
    }

    /**
     * Fetch from the last known timestamp-TRUST_THRESHOLD then work forwards
     * through pages until we get a blank response. This lets us get events
     * quicker than the TRUST_THRESHOLD
     *
     * @param {Function} batchHandler - Called with array of events for each batch
     * @param {Object} [options] - Fetch options
     * @param {Number} [options.maxEvents] - Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     * @param {Date} [options.begin] - Start timestamp (inclusive)
     * @param {Date} [options.end] - End timestamp (exclusive)
     * @param {String[]} [options.events] - Event types to fetch
     * @returns {Promise<void>}
     */
    async fetchLatest(batchHandler, options) {
        const mailgunOptions = {
            limit: PAGE_LIMIT,
            event: options?.events ? options.events.join(' OR ') : DEFAULT_EVENT_FILTER,
            tags: this.#tags.join(' AND '),
            begin: options?.begin ? options.begin.getTime() / 1000 : undefined,
            end: options?.end ? options.end.getTime() / 1000 : undefined,
            ascending: 'yes'
        };

        return this.#fetchAnalytics(mailgunOptions, batchHandler, {
            maxEvents: options?.maxEvents
        });
    }

    /**
     * @param {Object} mailgunOptions
     * @param {Number} mailgunOptions.limit
     * @param {String} mailgunOptions.event
     * @param {String} mailgunOptions.tags
     * @param {String} [mailgunOptions.begin]
     * @param {String} [mailgunOptions.ascending]
     * @param {Function} batchHandler
     * @param {Object} [options]
     * @param {Number} [options.maxEvents] - Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     */
    async #fetchAnalytics(mailgunOptions, batchHandler, options) {
        return await this.#mailgunClient.fetchEvents(mailgunOptions, batchHandler, options);
    }
}

module.exports = MailgunEmailAnalyticsProvider;
