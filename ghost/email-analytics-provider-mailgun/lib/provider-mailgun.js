const MailgunClient = require('@tryghost/mailgun-client');
const moment = require('moment');
const {EventProcessingResult} = require('@tryghost/email-analytics-service');

const EVENT_FILTER = 'delivered OR opened OR failed OR unsubscribed OR complained';
const PAGE_LIMIT = 300;
const TRUST_THRESHOLD_S = 30 * 60; // 30 minutes
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
     * Do not start from a particular time, grab latest then work back through
     * pages until we get a blank response
     *
     * @param {Function} batchHandler
     * @param {Object} [options]
     */
    fetchAll(batchHandler, options) {
        const mailgunOptions = {
            event: EVENT_FILTER,
            limit: PAGE_LIMIT,
            tags: this.tags.join(' AND ')
        };

        return this.#fetchAnalytics(mailgunOptions, batchHandler, options);
    }

    /**
     * Fetch from the last known timestamp-TRUST_THRESHOLD then work forwards
     * through pages until we get a blank response. This lets us get events
     * quicker than the TRUST_THRESHOLD
     *
     * @param {Date} latestTimestamp
     * @param {Function} batchHandler
     * @param {Object} [options]
     */
    fetchLatest(latestTimestamp, batchHandler, options) {
        const beginDate = moment(latestTimestamp).subtract(TRUST_THRESHOLD_S, 's').toDate();

        const mailgunOptions = {
            limit: PAGE_LIMIT,
            event: EVENT_FILTER,
            tags: this.tags.join(' AND '),
            begin: beginDate.toUTCString(),
            ascending: 'yes'
        };

        return this.#fetchAnalytics(mailgunOptions, batchHandler, options);
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
     */
    async #fetchAnalytics(mailgunOptions, batchHandler, options) {
        const events = await this.mailgunClient.fetchEvents(mailgunOptions, batchHandler, options);

        const processingResult = new EventProcessingResult();

        for (const event of events) {
            processingResult.merge(event);
        }

        return processingResult;
    }
}

module.exports = EmailAnalyticsProviderMailgun;
