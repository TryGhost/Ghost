const logging = require('@tryghost/logging');
const config = require('../../../shared/config');

/**
 * Additive webhook ingestion path for email analytics/suppression, alongside the
 * existing Mailgun poll loop (see email-analytics-service-wrapper.js). Ghost core owns
 * only the transport: the active email adapter decides whether it supports webhooks and
 * how to authenticate/parse them; Ghost normalizes nothing provider-specific and feeds
 * every event through the same EmailEventProcessor the poll loop already uses, so both
 * paths converge on one write path (delivery/opens/suppression list).
 *
 * See https://github.com/TryGhost/Ghost/issues/29828 for the design discussion. This is
 * a prototype attached to that proposal, not a claim on the final shape.
 */
class EmailAnalyticsWebhookController {
    #adapterManager;
    #emailEventProcessor;

    /**
     * @param {object} deps
     * @param {import('../adapter-manager').default} deps.adapterManager
     * @param {import('../email-service/email-event-processor')} deps.emailEventProcessor
     */
    constructor({adapterManager, emailEventProcessor}) {
        this.#adapterManager = adapterManager;
        this.#emailEventProcessor = emailEventProcessor;
    }

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @returns {Promise<void>}
     */
    async handle(req, res) {
        // `AdapterManager.getAdapter()` throws IncorrectUsageError, not NotFoundError,
        // when no `active` adapter is configured for this type (it's only NotFoundError
        // if the type itself isn't registered, which 'email' always is on this branch) -
        // so the "not configured" case has to be checked explicitly rather than inferred
        // from the error class, or a genuine misconfiguration is indistinguishable from
        // the default stock-Mailgun install.
        if (!config.get('adapters:email:active')) {
            res.writeHead(501);
            return res.end();
        }

        let adapter;
        try {
            adapter = this.#adapterManager.getAdapter('email');
        } catch (err) {
            logging.error(err);
            res.writeHead(500);
            return res.end();
        }

        if (typeof adapter.verifyWebhookRequest !== 'function' || typeof adapter.parseWebhookEvents !== 'function') {
            res.writeHead(501);
            return res.end();
        }

        if (!req.body || (Buffer.isBuffer(req.body) && req.body.length === 0)) {
            res.writeHead(400);
            return res.end();
        }

        let verified;
        try {
            verified = await adapter.verifyWebhookRequest(req);
        } catch (err) {
            logging.error(err);
            res.writeHead(401);
            return res.end();
        }

        if (!verified) {
            res.writeHead(401);
            return res.end();
        }

        let events;
        try {
            events = await adapter.parseWebhookEvents(req);
        } catch (err) {
            logging.error(err);
            res.writeHead(400);
            return res.end();
        }

        if (!Array.isArray(events)) {
            logging.warn(`[EmailAnalyticsWebhook] parseWebhookEvents() returned a non-array (${typeof events}); discarding batch`);
            res.writeHead(400);
            return res.end();
        }

        const validEvents = events.filter(event => this.isValidEvent(event));
        if (validEvents.length !== events.length) {
            logging.warn(`[EmailAnalyticsWebhook] Discarded ${events.length - validEvents.length} malformed event(s) out of ${events.length}`);
        }

        // Pre-resolve every recipient in one batched lookup instead of one query per
        // event - the sequential per-event path each of these could otherwise take
        // (email_batches lookup + email_recipients lookup) is what makes a real-sized
        // batch too slow to answer inside the HTTP request.
        const recipientCache = await this.#emailEventProcessor.batchGetRecipients(
            validEvents.map(event => ({email: event.email, emailId: event.emailId, providerId: event.providerId}))
        );

        const results = await Promise.all(validEvents.map(event => this.processEvent(event, recipientCache)));

        try {
            await this.#emailEventProcessor.flushBatchedUpdates();
        } catch (err) {
            logging.error(err, '[EmailAnalyticsWebhook] Failed to flush batched updates');
            results.push(false);
        }

        // A thrown error while processing an event (DB outage, pool exhaustion) is
        // retryable, so a non-2xx here lets the provider redeliver rather than silently
        // dropping analytics/suppression data with no cursor to recover it from.
        const hadFailure = results.some(succeeded => succeeded === false);
        res.writeHead(hadFailure ? 500 : 200);
        res.end();
    }

    /**
     * Boundary validation: a malformed event should not reach the processor and produce
     * confusing downstream failures (e.g. comparing a Date to a string timestamp).
     *
     * @param {import('../adapters/email/email-provider-base').EmailAnalyticsEvent} event
     * @returns {boolean}
     */
    isValidEvent(event) {
        return Boolean(event)
            && typeof event === 'object'
            && typeof event.email === 'string'
            && event.email.length > 0
            && Boolean(event.timestamp);
    }

    /**
     * @param {import('../adapters/email/email-provider-base').EmailAnalyticsEvent} event
     * @param {Map} recipientCache
     * @returns {Promise<boolean>} false only for a retryable failure (a thrown error) -
     *     an unresolved recipient is logged but does not fail the batch on its own.
     */
    async processEvent(event, recipientCache) {
        const identification = {email: event.email, emailId: event.emailId, providerId: event.providerId};
        const timestamp = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);

        try {
            let recipient;

            switch (event.type) {
            case 'delivered':
                recipient = await this.#emailEventProcessor.handleDelivered(identification, timestamp, recipientCache);
                break;
            case 'opened':
                recipient = await this.#emailEventProcessor.handleOpened(identification, timestamp, recipientCache);
                break;
            case 'permanent_failed':
                recipient = await this.#emailEventProcessor.handlePermanentFailed(identification, {
                    id: event.providerId, timestamp, error: event.error ?? null
                }, recipientCache);
                break;
            case 'temporary_failed':
                recipient = await this.#emailEventProcessor.handleTemporaryFailed(identification, {
                    id: event.providerId, timestamp, error: event.error ?? null
                }, recipientCache);
                break;
            case 'unsubscribed':
                recipient = await this.#emailEventProcessor.handleUnsubscribed(identification, timestamp, recipientCache);
                break;
            case 'complained':
                recipient = await this.#emailEventProcessor.handleComplained(identification, timestamp, recipientCache);
                break;
            default:
                logging.warn(`[EmailAnalyticsWebhook] Ignoring unknown event type: ${event.type}`);
                return true;
            }

            if (!recipient) {
                // Diagnosable instead of a silent, invisible drop behind a 200.
                logging.warn(`[EmailAnalyticsWebhook] Could not resolve recipient for ${event.type} event (email: ${event.email}, emailId: ${event.emailId ?? 'none'}, providerId: ${event.providerId ?? 'none'})`);
            }

            return true;
        } catch (err) {
            logging.error(err, `[EmailAnalyticsWebhook] Failed to process ${event.type} event`);
            return false;
        }
    }
}

module.exports = EmailAnalyticsWebhookController;
