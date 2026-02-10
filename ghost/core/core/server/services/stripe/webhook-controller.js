const logging = require('@tryghost/logging');

module.exports = class WebhookController {
    /**
     * @param {object} deps
     * @param {import('./webhook-manager')} deps.webhookManager
     * @param {import('./services/webhook/checkout-session-event-service')} deps.checkoutSessionEventService
     * @param {import('./services/webhook/subscription-event-service')} deps.subscriptionEventService
     * @param {import('./services/webhook/invoice-event-service')} deps.invoiceEventService
     */
    constructor(deps) {
        this.checkoutSessionEventService = deps.checkoutSessionEventService;
        this.subscriptionEventService = deps.subscriptionEventService;
        this.invoiceEventService = deps.invoiceEventService;
        this.webhookManager = deps.webhookManager;
        this.handlers = {
            'customer.subscription.deleted': this.subscriptionEvent,
            'customer.subscription.updated': this.subscriptionEvent,
            'customer.subscription.created': this.subscriptionEvent,
            'invoice.payment_succeeded': this.invoiceEvent,
            'checkout.session.completed': this.checkoutSessionEvent
        };
    }

    /**
     * Handles a Stripe webhook event.
     * - Parses the webhook event
     * - Delegates the event to the appropriate handler
     * - Returns a 200 response to Stripe to confirm receipt of the event, or an error response if the event is not handled or if an error occurs
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @returns {Promise<void>}
     */
    async handle(req, res) {
        if (!req.body || !req.headers['stripe-signature']) {
            res.writeHead(400);
            return res.end();
        }
        let event;
        try {
            event = this.webhookManager.parseWebhook(req.body, req.headers['stripe-signature']);
        } catch (err) {
            logging.error(err);
            res.writeHead(401);
            return res.end();
        }

        logging.info(`Handling webhook ${event.type}`);
        try {
            await this.handleEvent(event);
            res.writeHead(200);
            res.end();
        } catch (err) {
            logging.error(`Error handling webhook ${event.type}`, err);
            res.writeHead(err.statusCode || 500);
            res.end();
        }
    }

    /**
     * Accepts a webhook's event payload and delegates it to the appropriate handler based on the event type
     * @private
     * @param {import('stripe').Stripe.Event} event
     * @returns {Promise<void>}
     */
    async handleEvent(event) {
        if (!this.handlers[event.type]) {
            return;
        }

        await this.handlers[event.type].call(this, event.data.object);
    }

    /**
     * Delegates any `customer.subscription.*` events to the `subscriptionEventService`
     * @param {import('stripe').Stripe.Subscription} subscription
     * @private
     */
    async subscriptionEvent(subscription) {
        await this.subscriptionEventService.handleSubscriptionEvent(subscription);
    }

    /**
     * Delegates any `invoice.*` events to the `invoiceEventService`
     * @param {import('stripe').Stripe.Invoice} invoice
     * @private
     */
    async invoiceEvent(invoice) {
        await this.invoiceEventService.handleInvoiceEvent(invoice);
    }

    /**
     * Delegates any `checkout.session.*` events to the `checkoutSessionEventService`
     * @param {import('stripe').Stripe.Checkout.Session} session
     * @private
     */
    async checkoutSessionEvent(session) {
        await this.checkoutSessionEventService.handleEvent(session);
    }
};
