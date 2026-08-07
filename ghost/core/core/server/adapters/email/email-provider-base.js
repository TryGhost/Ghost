'use strict';

const errors = require('@tryghost/errors');

/**
 * @typedef EmailAnalyticsEvent
 * @property {'delivered'|'opened'|'permanent_failed'|'temporary_failed'|'unsubscribed'|'complained'} type
 * @property {string} email
 * @property {string} [emailId] Ghost's own Email id for this send, if the adapter can echo it
 *     back (e.g. via provider-side message tags/metadata set at send time). Takes priority over
 *     `providerId` and skips the `email_batches` lookup entirely - required for providers that
 *     report a per-recipient message id rather than a per-batch one.
 * @property {string} [providerId] The provider's message/send id for the batch, if known. Only
 *     resolvable when it matches a `email_batches.provider_id` row Ghost recorded at send time.
 * @property {Date} timestamp
 * @property {{code: number|string, enhancedCode?: number|string, message: string} | null} [error] Present for permanent_failed/temporary_failed
 */

class EmailProviderBase {
    constructor(config) {
        Object.defineProperty(this, 'requiredFns', {
            value: ['send', 'getMaximumRecipients', 'getTargetDeliveryWindow'],
            writable: false
        });

        this.config = config || {};
    }

    async send() {
        throw new errors.IncorrectUsageError({
            message: 'send() must be implemented by email provider adapter'
        });
    }

    /**
     * Optional. Implement to accept analytics/suppression webhooks from the provider
     * instead of Ghost polling for events. Return `false` (the default) to signal that
     * this adapter doesn't support webhook ingestion — Ghost responds 501 and does not
     * call `parseWebhookEvents`.
     *
     * @param {import('express').Request} req
     * @returns {Promise<boolean>|boolean}
     */
    verifyWebhookRequest(req) { // eslint-disable-line no-unused-vars
        return false;
    }

    /**
     * Optional. Only called when `verifyWebhookRequest` returns true. Normalize the
     * provider's webhook payload into Ghost's internal event shape.
     *
     * @param {import('express').Request} req
     * @returns {Promise<EmailAnalyticsEvent[]>|EmailAnalyticsEvent[]}
     */
    parseWebhookEvents(req) { // eslint-disable-line no-unused-vars
        return [];
    }
}

module.exports = EmailProviderBase;
