const WebhookManager = require('./webhook-manager');
const {BillingPortalManager} = require('./billing-portal-manager');
const StripeAPI = require('./stripe-api');
const StripeMigrations = require('./stripe-migrations');
const WebhookController = require('./webhook-controller');
const DomainEvents = require('@tryghost/domain-events');
const {StripeLiveEnabledEvent, StripeLiveDisabledEvent} = require('./events');
const SubscriptionEventService = require('./services/webhook/subscription-event-service');
const InvoiceEventService = require('./services/webhook/invoice-event-service');
const CheckoutSessionEventService = require('./services/webhook/checkout-session-event-service');

/**
 * @typedef {object} IStripeServiceConfig
 * @prop {string} secretKey The Stripe secret key
 * @prop {string} publicKey The Stripe publishable key
 * @prop {boolean} enablePromoCodes Whether to enable promo codes
 * @prop {boolean} enableAutomaticTax Whether to enable automatic tax
 * @prop {string} checkoutSessionSuccessUrl The URL to redirect to after successful checkout
 * @prop {string} checkoutSessionCancelUrl The URL to redirect to if checkout is cancelled
 * @prop {string} checkoutSetupSessionSuccessUrl The URL to redirect to after successful setup session
 * @prop {string} checkoutSetupSessionCancelUrl The URL to redirect to if setup session is cancelled
 * @prop {boolean} testEnv Whether this is a test environment
 * @prop {string} webhookSecret The Stripe webhook secret
 * @prop {string} webhookHandlerUrl The URL to handle Stripe webhooks
 * @prop {string} siteUrl The site URL for billing portal return URL
 */

/**
 * The `StripeService` contains the core logic for Ghost's Stripe integration.

 */
module.exports = class StripeService {
    /**
     * @param {object} deps
     * @param {*} deps.labs
     * @param {*} deps.membersService
     * @param {*} deps.donationService
     * @param {*} deps.staffService
     * @param {import('./webhook-manager').StripeWebhook} deps.StripeWebhook
     * @param {object} deps.settingsCache
     * @param {object} deps.models
     * @param {object} deps.models.Product
     * @param {object} deps.models.StripePrice
     * @param {object} deps.models.StripeCustomerSubscription
     * @param {object} deps.models.StripeProduct
     * @param {object} deps.models.MemberStripeCustomer
     * @param {object} deps.models.Offer
     * @param {object} deps.models.Settings
     */
    constructor({
        labs,
        membersService,
        donationService,
        staffService,
        StripeWebhook,
        settingsCache,
        models
    }) {
        const api = new StripeAPI({labs});
        const migrations = new StripeMigrations({
            models,
            api
        });

        const webhookManager = new WebhookManager({
            StripeWebhook,
            api
        });

        const billingPortalManager = new BillingPortalManager({
            api,
            models: {
                Settings: models.Settings
            },
            settingsCache
        });

        const subscriptionEventService = new SubscriptionEventService({
            get memberRepository(){
                return membersService.api.members;
            }
        });

        const invoiceEventService = new InvoiceEventService({
            api,
            get memberRepository(){
                return membersService.api.members;
            },
            get eventRepository(){
                return membersService.api.events;
            },
            get productRepository(){
                return membersService.api.productRepository;
            }
        });

        const checkoutSessionEventService = new CheckoutSessionEventService({
            api,
            get memberRepository(){
                return membersService.api.members;
            },
            get productRepository(){
                return membersService.api.productRepository;
            },
            get eventRepository(){
                return membersService.api.events;
            },
            get donationRepository(){
                return donationService.repository;
            },
            get staffServiceEmails(){
                return staffService.api.emails;
            },
            sendSignupEmail(email){
                return membersService.api.sendEmailWithMagicLink({
                    email,
                    requestedType: 'signup-paid',
                    options: {
                        forceEmailType: true
                    },
                    tokenData: {}
                });
            }
        });

        const webhookController = new WebhookController({
            webhookManager,
            subscriptionEventService,
            invoiceEventService,
            checkoutSessionEventService
        });

        this.models = models;
        this.api = api;
        this.webhookManager = webhookManager;
        this.migrations = migrations;
        this.webhookController = webhookController;
        this.billingPortalManager = billingPortalManager;
    }

    async connect() {
        DomainEvents.dispatch(StripeLiveEnabledEvent.create({message: 'Stripe Live Mode Enabled'}));
    }

    async disconnect() {
        await this.models.Product.forge().query().update({
            monthly_price_id: null,
            yearly_price_id: null
        });
        await this.models.StripePrice.forge().query().del();
        await this.models.StripeProduct.forge().query().del();
        await this.models.MemberStripeCustomer.forge().query().del();
        await this.models.Offer.forge().query().update({
            stripe_coupon_id: null
        });
        await this.webhookManager.stop();

        this.api.configure(null);

        DomainEvents.dispatch(StripeLiveDisabledEvent.create({message: 'Stripe Live Mode Disabled'}));
    }

    /**
     * Configures the Stripe API and registers the webhook with Stripe
     * @param {IStripeServiceConfig} config
     */
    async configure(config) {
        this.api.configure({
            secretKey: config.secretKey,
            publicKey: config.publicKey,
            enablePromoCodes: config.enablePromoCodes,
            get enableAutomaticTax() {
                return config.enableAutomaticTax;
            },
            checkoutSessionSuccessUrl: config.checkoutSessionSuccessUrl,
            checkoutSessionCancelUrl: config.checkoutSessionCancelUrl,
            checkoutSetupSessionSuccessUrl: config.checkoutSetupSessionSuccessUrl,
            checkoutSetupSessionCancelUrl: config.checkoutSetupSessionCancelUrl,
            testEnv: config.testEnv
        });

        await this.webhookManager.configure({
            webhookSecret: config.webhookSecret,
            webhookHandlerUrl: config.webhookHandlerUrl
        });
        await this.webhookManager.start();

        this.billingPortalManager.configure({
            siteUrl: config.siteUrl
        });
        await this.billingPortalManager.start();
    }
};
