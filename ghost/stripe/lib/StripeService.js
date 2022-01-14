const WebhookManager = require('./WebhookManager');
const StripeAPI = require('./StripeAPI');
const StripeMigrations = require('./Migrations');

module.exports = class StripeService {
    constructor({
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

        this.models = models;
        this.api = api;
        this.webhookManager = webhookManager;
        this.migrations = migrations;
    }

    async connect() {
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
    }

    async configure(config) {
        this.api.configure({
            secretKey: config.secretKey,
            publicKey: config.publicKey,
            enablePromoCodes: config.enablePromoCodes
        });

        console.log('finna setup webhooks');
        console.log(config.webhookSecret, config.webhookHandlerUrl);
        await this.webhookManager.configure({
            webhookSecret: config.webhookSecret,
            webhookHandlerUrl: config.webhookHandlerUrl
        });
        await this.webhookManager.start();
        console.log('webhooks done');
    }
};
