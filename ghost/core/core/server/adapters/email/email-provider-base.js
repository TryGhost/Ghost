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

    /**
     * @param {object} data
     * @param {string} data.subject
     * @param {string} data.from
     * @param {string} [data.replyTo]
     * @param {string} data.html
     * @param {string} data.plaintext
     * @param {object[]} data.recipients
     * @param {string} data.emailId Ghost's own Email id for this send. Providers that report a
     *     per-recipient message id rather than a per-batch one (e.g. SES, Postmark) should echo
     *     this back via provider-side message tags/metadata, so it can be read off the webhook
     *     event later and used as the correlation field in `parseWebhookEvents()` - see
     *     `EmailAnalyticsEvent.emailId` above.
     * @param {string} [data.domainOverride]
     * @param {object} options
     * @returns {Promise<object>}
     */
    async send() {
        throw new errors.IncorrectUsageError({
            message: 'send() must be implemented by email provider adapter'
        });
    }

    // Throwing stubs, matching send() - `requiredFns` names all three, and
    // AdapterManager.getAdapter() throws IncorrectUsageError for any entry that isn't a
    // function, so the base class needs a real (if unimplemented) method for each.
    getMaximumRecipients() {
        throw new errors.IncorrectUsageError({
            message: 'getMaximumRecipients() must be implemented by email provider adapter'
        });
    }

    getTargetDeliveryWindow() {
        throw new errors.IncorrectUsageError({
            message: 'getTargetDeliveryWindow() must be implemented by email provider adapter'
        });
    }

    /**
     * Optional. Override to accept analytics/suppression webhooks from the provider
     * instead of Ghost polling for events. Leaving this un-overridden (the default) is
     * how Ghost detects that an adapter doesn't support webhook ingestion - the
     * controller compares the instance method against this prototype method, not the
     * return value, so overriding is what signals support, not what you return from it.
     *
     * @param {import('express').Request} req
     * @returns {Promise<boolean>|boolean}
     */
    verifyWebhookRequest(req) { // eslint-disable-line no-unused-vars
        return false;
    }

    /**
     * Optional. Only called when `verifyWebhookRequest` returns true. Normalize the
     * provider's webhook payload into Ghost's internal event shape. `emailId` is the
     * most reliable correlation field for providers that report a per-recipient message
     * id rather than a per-batch one: Ghost's own email id is available to `send()` in
     * the payload it's given and can be echoed back via the provider's own message
     * tags/metadata at send time, then read back off the webhook event here.
     *
     * @param {import('express').Request} req
     * @returns {Promise<EmailAnalyticsEvent[]>|EmailAnalyticsEvent[]}
     */
    parseWebhookEvents(req) { // eslint-disable-line no-unused-vars
        return [];
    }
}

module.exports = EmailProviderBase;
