const logging = require('@tryghost/logging');
const SubscriptionEventService = require('./services/webhook/SubscriptionEventService');
const InvoiceEventService = require('./services/webhook/InvoiceEventService');
const CheckoutSessionEventService = require('./services/webhook/CheckoutSessionEventService');

module.exports = class WebhookController {
    /**
     * @param {object} deps
     * @param {import('./StripeAPI')} deps.api
     * @param {import('./WebhookManager')} deps.webhookManager
     * @param {any} deps.eventRepository
     * @param {any} deps.memberRepository
     * @param {any} deps.productRepository
     * @param {import('@tryghost/donations').DonationRepository} deps.donationRepository
     * @param {any} deps.staffServiceEmails
     * @param {any} deps.sendSignupEmail
     */
    constructor(deps) {
        this.deps = deps;
        this.webhookManager = deps.webhookManager;
        this.api = deps.api;
        this.sendSignupEmail = deps.sendSignupEmail;
        this.handlers = {
            'customer.subscription.deleted': this.subscriptionEvent,
            'customer.subscription.updated': this.subscriptionEvent,
            'customer.subscription.created': this.subscriptionEvent,
            'invoice.payment_succeeded': this.invoiceEvent,
            'checkout.session.completed': this.checkoutSessionEvent
        };

        // We pass the entire `deps` object to ensure all dependencies are available
        // for services that may require dynamic access to multiple dependencies.
        // This is particularly important in E2E tests where real services
        // interact with a full set of dependencies (e.g., various repositories, services).
        // Limiting injected dependencies may cause failures when certain dependencies
        // are not explicitly passed but are expected by the services at runtime.
        this.initializeServices(deps);
    }

    /**
     * Initializes event services
     * @param {object} deps 
     */
    initializeServices(deps) {
        // Initialize event services with all dependencies, as per the above explanation.
        this.subscriptionEventService = new SubscriptionEventService(deps);
        this.invoiceEventService = new InvoiceEventService(deps);
        this.checkoutSessionEventService = new CheckoutSessionEventService(deps);
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
