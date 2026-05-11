const logging = require('@tryghost/logging');

/**
 * Resend analytics provider stub.
 * Resend delivers email events via webhooks (push), not a polling API.
 * To receive open/click/bounce events from Resend, configure a webhook
 * endpoint in the Resend dashboard pointing to your Ghost instance.
 * This stub prevents errors when the analytics job runs.
 */
class EmailAnalyticsProviderResend {
    constructor() {}

    /**
     * Matches MailgunProvider.fetchLatest signature. Resend pushes events via
     * webhooks, so polling is a no-op — the params are accepted but ignored.
     *
     * @param {Function} [batchHandler]
     * @param {object} [options]
     */
    // eslint-disable-next-line no-unused-vars
    fetchLatest(batchHandler, options) {
        logging.info('[ResendAnalytics] Polling not supported — Resend uses webhooks for email events');
        return Promise.resolve();
    }
}

module.exports = EmailAnalyticsProviderResend;
