const PostmarkClient = require('@tryghost/postmark-client');

const EVENT_FILTER = 'delivered OR opened OR failed OR unsubscribed OR complained';
const PAGE_LIMIT = 300;
const DEFAULT_TAGS = ['bulk-email'];

class EmailAnalyticsProviderPostmark {
    postmarkClient;

    constructor({config, settings}) {
        this.postmarkClient = new PostmarkClient({config, settings});
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
     */
    fetchLatest(batchHandler, options) {
        const postmarkOptions = {
            limit: PAGE_LIMIT,
            event: EVENT_FILTER,
            tags: this.tags.join(' AND '),
            begin: options.begin ? options.begin.getTime() / 1000 : undefined,
            end: options.end ? options.end.getTime() / 1000 : undefined,
            ascending: 'yes'
        };

        return this.#fetchAnalytics(postmarkOptions, batchHandler, {
            maxEvents: options.maxEvents
        });
    }

    /**
     * @param {Object} postmarkOptions
     * @param {Number} postmarkOptions.limit
     * @param {String} postmarkOptions.event
     * @param {String} postmarkOptions.tags
     * @param {String} [postmarkOptions.begin]
     * @param {String} [postmarkOptions.ascending]
     * @param {Function} batchHandler
     * @param {Object} [options]
     * @param {Number} [options.maxEvents] Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     */
    async #fetchAnalytics(postmarkOptions, batchHandler, options) {
        return await this.postmarkClient.fetchEvents(postmarkOptions, batchHandler, options);
    }
}

module.exports = EmailAnalyticsProviderPostmark;
