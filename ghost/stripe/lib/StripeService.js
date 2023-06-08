const WebhookManager = require('./WebhookManager');
const StripeAPI = require('./StripeAPI');
const StripeMigrations = require('./StripeMigrations');
const WebhookController = require('./WebhookController');
const DomainEvents = require('@tryghost/domain-events');
const {StripeLiveEnabledEvent, StripeLiveDisabledEvent} = require('./events');

module.exports = class StripeService {
    constructor({
        membersService,
        StripeWebhook,
        models
    }) {
        const api = new StripeAPI();
        const webhookManager = new WebhookManager({
            StripeWebhook,
            api
        });
        const migrations = new StripeMigrations({
            models,
            api
        });
        const webhookController = new WebhookController({
            webhookManager,
            api,
            get memberRepository(){
                return membersService.api.members;
            },
            get productRepository() {
                return membersService.api.productRepository;
            },
            get eventRepository() {
                return membersService.api.events;
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

        this.models = models;
        this.api = api;
        this.webhookManager = webhookManager;
        this.migrations = migrations;
        this.webhookController = webhookController;
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
    }
};
