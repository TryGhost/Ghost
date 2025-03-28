const MailgunClient = require('@tryghost/mailgun-client');

const DEFAULT_EVENT_FILTER = 'delivered OR opened OR failed OR unsubscribed OR complained';
const PAGE_LIMIT = 300;
const DEFAULT_TAGS = ['bulk-email'];

class EmailAnalyticsProviderMailgun {
    mailgunClient;

    constructor({config, settings}) {
        this.mailgunClient = new MailgunClient({config, settings});
        this.tags = [...DEFAULT_TAGS];

        if (config.get('bulkEmail:mailgun:tag')) {
            this.tags.push(config.get('bulkEmail:mailgun:tag'));
        }
    }

    /**
     * Fetch from the last known timestamp-TRUST_THRESHOLD then work forwards
     * through pages until we get a blank response. This lets us get events
     * quicker than the TRUST_THRESHOLD
     *
     * @param {Function} batchHandler
     * @param {Object} [options]
     * @param {Number} [options.maxEvents] Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     * @param {Date} [options.begin]
     * @param {Date} [options.end]
     * @param {String[]} [options.events]
     */
    fetchLatest(batchHandler, options) {
        const mailgunOptions = {
            limit: PAGE_LIMIT,
            event: options?.events ? options.events.join(' OR ') : DEFAULT_EVENT_FILTER,
            tags: this.tags.join(' AND '),
            begin: options.begin ? options.begin.getTime() / 1000 : undefined,
            end: options.end ? options.end.getTime() / 1000 : undefined,
            ascending: 'yes'
        };

        return this.#fetchAnalytics(mailgunOptions, batchHandler, {
            maxEvents: options.maxEvents
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
     * @param {Number} [options.maxEvents] Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     */
    async #fetchAnalytics(mailgunOptions, batchHandler, options) {
        return await this.mailgunClient.fetchEvents(mailgunOptions, batchHandler, options);
    }
}

module.exports = EmailAnalyticsProviderMailgun;
