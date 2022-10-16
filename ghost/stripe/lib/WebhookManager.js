/**
 * @typedef {import('stripe').Stripe.WebhookEndpointCreateParams.EnabledEvent} WebhookEvent
 */

/**
 * @typedef {import('stripe').Stripe.WebhookEndpoint} Webhook
 */

/**
 * @typedef {import('./StripeAPI')} StripeAPI
 */

/**
 * @typedef {object} StripeWebhookModel
 * @prop {string} webhook_id
 * @prop {string} secret
 */

/**
 * @typedef {object} StripeWebhook
 * @prop {(data: StripeWebhookModel) => Promise<StripeWebhookModel>} save
 * @prop {() => Promise<StripeWebhookModel>} get
 */

module.exports = class WebhookManager {
    /**
     * @param {object} deps
     * @param {StripeWebhook} deps.StripeWebhook
     * @param {StripeAPI} deps.api
     */
    constructor({
        StripeWebhook,
        api
    }) {
        /** @private */
        this.StripeWebhook = StripeWebhook;
        /** @private */
        this.api = api;
        /** @private */
        this.config = null;
        /** @private */
        this.webhookSecret = null;
        /**
         * @private
         * @type {'network'|'local'}
         */
        this.mode = 'network';
    }

    /** @type {WebhookEvent[]} */
    static events = [
        'checkout.session.completed',
        'customer.subscription.deleted',
        'customer.subscription.updated',
        'customer.subscription.created',
        'invoice.payment_succeeded'
    ];

    /**
     * @returns {Promise<boolean>}
     */
    async stop() {
        if (this.mode !== 'network') {
            return;
        }

        try {
            const existingWebhook = await this.StripeWebhook.get();
            if (existingWebhook.webhook_id) {
                await this.api.deleteWebhookEndpoint(existingWebhook.webhook_id);
            }
            await this.StripeWebhook.save({
                webhook_id: null,
                secret: null
            });
            return true;
        } catch (err) {
            return false;
        }
    }

    async start() {
        if (this.mode !== 'network') {
            return;
        }
        const existingWebhook = await this.StripeWebhook.get();

        const webhook = await this.setupWebhook(existingWebhook.webhook_id, existingWebhook.secret);

        await this.StripeWebhook.save({
            webhook_id: webhook.id,
            secret: webhook.secret
        });

        this.webhookSecret = webhook.secret;
    }

    /**
     * @param {object} config
     * @param {string} [config.webhookSecret] An optional webhook secret for use with stripe-cli, passing this will ensure a webhook is not created in Stripe
     * @param {string} config.webhookHandlerUrl The URL which the Webhook should hit
     *
     * @returns {Promise<void>}
     */
    async configure(config) {
        this.config = config;
        if (config.webhookSecret) {
            this.webhookSecret = config.webhookSecret;
            this.mode = 'local';
        }
    }

    /**
     * @param {string} [id]
     * @param {string} [secret]
     * @param {object} [opts]
     * @param {boolean} [opts.forceCreate]
     * @param {boolean} [opts.skipDelete]
     *
     * @returns {Promise<Webhook>}
     */
    async setupWebhook(id, secret, opts = {}) {
        if (!id || !secret || opts.forceCreate) {
            if (id && !opts.skipDelete) {
                try {
                    await this.api.deleteWebhookEndpoint(id);
                } catch (err) {
                    // Continue
                }
            }
            const webhook = await this.api.createWebhookEndpoint(
                this.config.webhookHandlerUrl,
                WebhookManager.events
            );
            return {
                id: webhook.id,
                secret: webhook.secret
            };
        } else {
            try {
                await this.api.updateWebhookEndpoint(
                    id,
                    this.config.webhookHandlerUrl,
                    WebhookManager.events
                );

                return {
                    id,
                    secret
                };
            } catch (err) {
                if (err.code === 'resource_missing') {
                    return this.setupWebhook(id, secret, {skipDelete: true, forceCreate: true});
                }
                return this.setupWebhook(id, secret, {skipDelete: false, forceCreate: true});
            }
        }
    }

    /**
     * @param {string} body
     * @param {string} signature
     * @returns {import('stripe').Stripe.Event}
     */
    parseWebhook(body, signature) {
        return this.api.parseWebhook(body, signature, this.webhookSecret);
    }
};
