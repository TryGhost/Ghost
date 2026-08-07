const logging = require('@tryghost/logging');

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
        let adapter;
        try {
            adapter = this.#adapterManager.getAdapter('email');
        } catch (err) {
            // No email adapter configured (stock Mailgun) - webhooks aren't applicable.
            res.writeHead(501);
            return res.end();
        }

        if (typeof adapter.verifyWebhookRequest !== 'function' || typeof adapter.parseWebhookEvents !== 'function') {
            res.writeHead(501);
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

        for (const event of events ?? []) {
            await this.processEvent(event);
        }

        res.writeHead(200);
        res.end();
    }

    /**
     * @param {import('../adapters/email/email-provider-base').EmailAnalyticsEvent} event
     */
    async processEvent(event) {
        const identification = {email: event.email, providerId: event.providerId};

        try {
            switch (event.type) {
            case 'delivered':
                await this.#emailEventProcessor.handleDelivered(identification, event.timestamp);
                break;
            case 'opened':
                await this.#emailEventProcessor.handleOpened(identification, event.timestamp);
                break;
            case 'permanent_failed':
                await this.#emailEventProcessor.handlePermanentFailed(identification, {
                    id: event.providerId, timestamp: event.timestamp, error: event.error ?? null
                });
                break;
            case 'temporary_failed':
                await this.#emailEventProcessor.handleTemporaryFailed(identification, {
                    id: event.providerId, timestamp: event.timestamp, error: event.error ?? null
                });
                break;
            case 'unsubscribed':
                await this.#emailEventProcessor.handleUnsubscribed(identification, event.timestamp);
                break;
            case 'complained':
                await this.#emailEventProcessor.handleComplained(identification, event.timestamp);
                break;
            default:
                logging.warn(`[EmailAnalyticsWebhook] Ignoring unknown event type: ${event.type}`);
            }
        } catch (err) {
            // One bad event in a webhook batch shouldn't drop the rest.
            logging.error(err, `[EmailAnalyticsWebhook] Failed to process ${event.type} event`);
        }
    }
}

module.exports = EmailAnalyticsWebhookController;
