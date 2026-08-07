const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const EmailProviderBase = require('../../adapters/email/email-provider-base');

// A bound on concurrent DB work per request, not a throughput target. Existing handlers
// (handlePermanentFailed/handleComplained) each sleep 70ms specifically to keep the knex
// pool from running dry (see email-event-processor.js) - that only works if something
// bounds how many are in flight at once.
const EVENT_CONCURRENCY = 5;

// A generated batchGetRecipients() query grows one `orWhere` per event, and an
// unbounded Promise.all defeats the per-event pool throttle above regardless of
// concurrency limiting downstream. Reject rather than silently truncate - the caller
// (an SNS/webhook provider) is expected to send smaller batches on retry.
const MAX_EVENTS_PER_REQUEST = 500;

/**
 * Runs `fn` over `items` with at most `limit` in flight at a time. `Promise.all` over an
 * unbounded batch would open one DB connection/transaction per event; a real SNS/SES
 * batch is easily large enough to exhaust the knex pool that way.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let cursor = 0;

    async function worker() {
        while (cursor < items.length) {
            const index = cursor;
            cursor += 1;
            results[index] = await fn(items[index]);
        }
    }

    await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
    return results;
}

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

        if (!this.supportsWebhooks(adapter)) {
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

        if (validEvents.length > MAX_EVENTS_PER_REQUEST) {
            logging.warn(`[EmailAnalyticsWebhook] Rejecting batch of ${validEvents.length} events - exceeds the ${MAX_EVENTS_PER_REQUEST}-per-request cap`);
            res.writeHead(413);
            return res.end();
        }

        // Pre-resolve every recipient in one batched lookup instead of one query per
        // event - the sequential per-event path each of these could otherwise take
        // (email_batches lookup + email_recipients lookup) is what makes a real-sized
        // batch too slow to answer inside the HTTP request.
        const recipientCache = await this.#emailEventProcessor.batchGetRecipients(
            validEvents.map(event => ({email: event.email, emailId: event.emailId, providerId: event.providerId}))
        );

        const results = await mapWithConcurrency(
            validEvents,
            EVENT_CONCURRENCY,
            event => this.processEvent(event, recipientCache)
        );

        let flushFailed = false;
        try {
            await this.#emailEventProcessor.flushBatchedUpdates();
        } catch (err) {
            logging.error(err, '[EmailAnalyticsWebhook] Failed to flush batched updates');
            flushFailed = true;
        }

        // A thrown error while processing an event (DB outage, pool exhaustion) is
        // retryable, so a non-2xx here lets the provider redeliver rather than silently
        // dropping analytics/suppression data with no cursor to recover it from. This is
        // whole-batch, at-least-once semantics: a retry re-runs every event in the
        // batch, including ones that already succeeded.
        const hadFailure = flushFailed || results.some(succeeded => succeeded === false);
        res.writeHead(hadFailure ? 500 : 200);
        res.end();
    }

    /**
     * An adapter "supports webhooks" only if it overrides both methods - the base class
     * gives every adapter a real (non-throwing) implementation of each so that adapters
     * which don't care about webhooks don't have to know these methods exist, but that
     * means a plain `typeof adapter.verifyWebhookRequest === 'function'` check is always
     * true and can never signal "not supported".
     *
     * @param {import('../adapters/email/email-provider-base')} adapter
     * @returns {boolean}
     */
    supportsWebhooks(adapter) {
        return typeof adapter.verifyWebhookRequest === 'function'
            && typeof adapter.parseWebhookEvents === 'function'
            && adapter.verifyWebhookRequest !== EmailProviderBase.prototype.verifyWebhookRequest
            && adapter.parseWebhookEvents !== EmailProviderBase.prototype.parseWebhookEvents;
    }

    /**
     * Boundary validation: a malformed event should not reach the processor and produce
     * confusing downstream failures (e.g. an unparseable timestamp being written as the
     * literal string "Invalid date").
     *
     * @param {import('../adapters/email/email-provider-base').EmailAnalyticsEvent} event
     * @returns {boolean}
     */
    isValidEvent(event) {
        if (!event || typeof event !== 'object') {
            return false;
        }
        if (typeof event.email !== 'string' || event.email.length === 0) {
            return false;
        }
        if (!event.timestamp) {
            return false;
        }
        const timestamp = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);
        if (Number.isNaN(timestamp.getTime())) {
            return false;
        }
        return true;
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
                    id: event.providerId, timestamp, error: event.error ?? null, isWebhookSourced: true
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
