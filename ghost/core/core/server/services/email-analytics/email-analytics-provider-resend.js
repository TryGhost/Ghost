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

    fetchLatest() {
        logging.info('[ResendAnalytics] Polling not supported — Resend uses webhooks for email events');
        return Promise.resolve();
    }
}

module.exports = EmailAnalyticsProviderResend;
