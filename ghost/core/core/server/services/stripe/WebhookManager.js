/**
 * @typedef {import('stripe').Stripe.WebhookEndpointCreateParams.EnabledEvent} WebhookEvent
 * @typedef {import('./StripeAPI')} StripeAPI
 */

const logging = require('@tryghost/logging');

/**
 * @typedef {object} StripeWebhookModel
 * @prop {string} webhook_id
 * @prop {string} secret
 */

/**
 * @typedef {object} StripeWebhook
 * @prop {(data: StripeWebhookModel) => Promise<void>} save
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
     * Deletes the Stripe Webhook Endpoint and saves null values for the webhook ID and secret.
     * 
     * @returns {Promise<boolean>}
     */
    async stop() {
        logging.info(`[Stripe Webhook] WebhookManager.stop() called - mode: ${this.mode}`);
        
        if (this.mode !== 'network') {
            logging.info(`[Stripe Webhook] stop() skipped - not in network mode (mode: ${this.mode})`);
            return;
        }

        try {
            const existingWebhook = await this.StripeWebhook.get();
            logging.info(`[Stripe Webhook] stop() - existing webhook from settings - webhook_id: ${existingWebhook.webhook_id || 'null'}, has_secret: ${!!existingWebhook.secret}`);
            
            if (existingWebhook.webhook_id) {
                logging.info(`[Stripe Webhook] stop() - deleting webhook endpoint in Stripe - webhook_id: ${existingWebhook.webhook_id}`);
                await this.api.deleteWebhookEndpoint(existingWebhook.webhook_id);
            }
            
            logging.info('[Stripe Webhook] stop() - clearing webhook settings in database');
            await this.StripeWebhook.save({
                webhook_id: null,
                secret: null
            });
            logging.info('[Stripe Webhook] stop() - webhook settings cleared successfully');
            return true;
        } catch (err) {
            logging.error(`[Stripe Webhook] stop() failed - error: ${err.message}`, err);
            return false;
        }
    }

    /**
     * Starts the Stripe Webhook Endpoint and saves the webhook ID and secret.
     * 
     * @returns {Promise<void>}
     */
    async start() {
        logging.info(`[Stripe Webhook] WebhookManager.start() called - mode: ${this.mode}, webhookHandlerUrl: ${this.config?.webhookHandlerUrl || 'null'}`);
        
        if (this.mode !== 'network') {
            logging.info(`[Stripe Webhook] start() skipped - not in network mode (mode: ${this.mode})`);
            return;
        }
        
        const existingWebhook = await this.StripeWebhook.get();
        logging.info(`[Stripe Webhook] start() - existing webhook from settings - webhook_id: ${existingWebhook.webhook_id || 'null'}, has_secret: ${!!existingWebhook.secret}`);

        try {
            const webhook = await this.setupWebhook(existingWebhook.webhook_id, existingWebhook.secret);
            logging.info(`[Stripe Webhook] start() - setupWebhook() completed - webhook_id: ${webhook.id}, has_secret: ${!!webhook.secret}`);

            logging.info('[Stripe Webhook] start() - saving webhook to settings');
            await this.StripeWebhook.save({
                webhook_id: webhook.id,
                secret: webhook.secret
            });
            logging.info(`[Stripe Webhook] start() - webhook saved to settings successfully - webhook_id: ${webhook.id}`);

            this.webhookSecret = webhook.secret;
        } catch (err) {
            logging.error(`[Stripe Webhook] start() failed - error: ${err.message}, code: ${err.code || 'none'}, type: ${err.type || 'none'}`, err);
            throw err;
        }
    }

    /**
     * Configures the Stripe Webhook Manager.
     * @param {object} config
     * @param {string} [config.webhookSecret] An optional webhook secret for use with stripe-cli, passing this will ensure a webhook is not created in Stripe
     * @param {string} config.webhookHandlerUrl The URL which the Webhook should hit
     *
     * @returns {Promise<void>}
     */
    async configure(config) {
        logging.info(`[Stripe Webhook] WebhookManager.configure() called - has_webhookSecret: ${!!config?.webhookSecret}, webhookHandlerUrl: ${config?.webhookHandlerUrl || 'null'}`);
        
        this.config = config;
        if (config.webhookSecret) {
            this.webhookSecret = config.webhookSecret;
            this.mode = 'local';
            logging.info('[Stripe Webhook] configure() - set to local mode (using env webhook secret)');
        } else {
            this.mode = 'network';
            logging.info('[Stripe Webhook] configure() - set to network mode (will create webhook in Stripe)');
        }
    }

    /**
     * Setup a new Stripe Webhook Endpoint.
     * - If the webhook exists, delete it and create a new one
     * - If the webhook does not exist, create a new one
     * 
     * @param {string} [id]
     * @param {string} [secret]
     * @param {object} [opts]
     * @param {boolean} [opts.forceCreate]
     * @param {boolean} [opts.skipDelete]
     *
     * @returns {Promise<{id: string, secret: string}>}
     */
    async setupWebhook(id, secret, opts = {}) {
        logging.info(`[Stripe Webhook] setupWebhook() called - webhook_id: ${id || 'null'}, has_secret: ${!!secret}, forceCreate: ${opts.forceCreate || false}, skipDelete: ${opts.skipDelete || false}, webhookHandlerUrl: ${this.config?.webhookHandlerUrl || 'null'}`);
        
        if (!id || !secret || opts.forceCreate) {
            const reason = !id ? 'no_id' : !secret ? 'no_secret' : 'forceCreate';
            logging.info(`[Stripe Webhook] setupWebhook() - will create new webhook - reason: ${reason}`);
            
            if (id && !opts.skipDelete) {
                logging.info(`[Stripe Webhook] setupWebhook() - deleting existing webhook before create - webhook_id: ${id}`);
                try {
                    await this.api.deleteWebhookEndpoint(id);
                    logging.info('[Stripe Webhook] setupWebhook() - webhook deleted successfully');
                } catch (err) {
                    logging.warn(`[Stripe Webhook] setupWebhook() - webhook deletion failed, continuing - webhook_id: ${id}, error: ${err.message}`);
                    // Continue
                }
            } else if (id && opts.skipDelete) {
                logging.info(`[Stripe Webhook] setupWebhook() - skipping deletion (skipDelete=true) - webhook_id: ${id}`);
            }
            
            logging.info('[Stripe Webhook] setupWebhook() - creating webhook endpoint in Stripe');
            const webhook = await this.api.createWebhookEndpoint(
                this.config.webhookHandlerUrl,
                WebhookManager.events
            );
            logging.info(`[Stripe Webhook] setupWebhook() - webhook created successfully - webhook_id: ${webhook.id}, has_secret: ${!!webhook.secret}`);
            
            return {
                id: webhook.id,
                secret: webhook.secret
            };
        } else {
            logging.info(`[Stripe Webhook] setupWebhook() - will update existing webhook - webhook_id: ${id}`);
            
            try {
                await this.api.updateWebhookEndpoint(
                    id,
                    this.config.webhookHandlerUrl,
                    WebhookManager.events
                );
                logging.info(`[Stripe Webhook] setupWebhook() - webhook updated successfully - webhook_id: ${id}`);

                return {
                    id,
                    secret
                };
            } catch (err) {
                logging.warn(`[Stripe Webhook] setupWebhook() - update failed, will recreate - webhook_id: ${id}, error: ${err.message}, code: ${err.code || 'none'}, type: ${err.type || 'none'}`);
                
                if (err.code === 'resource_missing') {
                    logging.info(`[Stripe Webhook] setupWebhook() - webhook missing in Stripe, recreating with skipDelete - webhook_id: ${id}`);
                    return this.setupWebhook(id, secret, {skipDelete: true, forceCreate: true});
                }
                logging.info(`[Stripe Webhook] setupWebhook() - update error, recreating webhook - webhook_id: ${id}, error_code: ${err.code || 'none'}`);
                return this.setupWebhook(id, secret, {skipDelete: false, forceCreate: true});
            }
        }
    }

    /**
     * Parse a Stripe Webhook event.
     * 
     * @param {string} body
     * @param {string} signature
     * @returns {import('stripe').Stripe.Event}
     */
    parseWebhook(body, signature) {
        return this.api.parseWebhook(body, signature, this.webhookSecret);
    }
};
