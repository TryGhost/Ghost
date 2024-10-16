const logging = require('@tryghost/logging');

module.exports = class WebhookController {
    /**
     * @param {object} deps
     * @param {import('./WebhookManager')} deps.webhookManager
     * @param {import('./services/webhook/CheckoutSessionEventService')} deps.checkoutSessionEventService
     * @param {import('./services/webhook/SubscriptionEventService')} deps.subscriptionEventService
     * @param {import('./services/webhook/InvoiceEventService')} deps.invoiceEventService
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

    async handle(req, res) {
        // if (!apiService.configured) {
        //     logging.error(`Stripe not configured, not handling webhook`);
        //     res.writeHead(400);
        //     return res.end();
        // }

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
     * @private
     */
    async handleEvent(event) {
        if (!this.handlers[event.type]) {
            return;
        }

        await this.handlers[event.type].call(this, event.data.object);
    }

    /**
     * @private
     */
    async subscriptionEvent(subscription) {
        await this.subscriptionEventService.handleSubscriptionEvent(subscription);
    }

    /**
     * @param {import('stripe').Stripe.Invoice} invoice
     * @private
     */
    async invoiceEvent(invoice) {
        await this.invoiceEventService.handleInvoiceEvent(invoice);
    }

    /**
     * @private
     */
    async checkoutSessionEvent(session) {
        await this.checkoutSessionEventService.handleEvent(session);
    }
};
