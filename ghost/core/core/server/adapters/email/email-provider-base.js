'use strict';

const errors = require('@tryghost/errors');

/**
 * @typedef EmailAnalyticsEvent
 * @property {'delivered'|'opened'|'permanent_failed'|'temporary_failed'|'unsubscribed'|'complained'} type
 * @property {string} email
 * @property {string} [providerId] The provider's message/send id for this recipient, if known
 * @property {Date} timestamp
 * @property {{code: number|string, message: string} | null} [error] Present for permanent_failed/temporary_failed
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
