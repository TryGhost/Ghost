const errors = require('@tryghost/errors');
const { FAILURE_CODES } = require('./webhook/failures');

/**
 * How often, at most, a failed signature check reads the stored secret from the database, so
 * requests with a bad signature can't each cost a read.
 */
const SECRET_READ_INTERVAL_MS = 1000;

/**
 * @typedef {import('stripe').Stripe.WebhookEndpointCreateParams.EnabledEvent} WebhookEvent
 * @typedef {import('./stripe-api')} StripeAPI
 */

/**
 * @typedef {import('./webhook-store').WebhookStore} StripeWebhook
 */

module.exports = class WebhookManager {
  /**
   * @param {object} deps
   * @param {StripeWebhook} deps.StripeWebhook
   * @param {StripeAPI} deps.api
   */
  constructor({ StripeWebhook, api }) {
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
     * @type {{at: number, secret: Promise<string|null>}|null}
     */
    this.secretRead = null;
    /**
     * @private
     * @type {'network'|'local'}
     */
    this.mode = 'network';
  }

  /** @type {WebhookEvent[]} */
  static events = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'customer.subscription.deleted',
    'customer.subscription.updated',
    'customer.subscription.created',
    'invoice.payment_succeeded',
    'charge.refunded',
  ];

  /**
   * Deletes the Stripe Webhook Endpoint and saves null values for the webhook ID and secret.
   *
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
        secret: null,
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Starts the Stripe Webhook Endpoint. A new endpoint's ID and secret are saved.
   *
   * @returns {Promise<void>}
   */
  async start() {
    if (this.mode !== 'network') {
      return;
    }
    const existingWebhook = await this.StripeWebhook.get();
    // Set before calling Stripe, so events are still accepted when the call fails.
    this.webhookSecret = existingWebhook.secret;

    const webhook = await this.setupWebhook(existingWebhook.webhook_id, existingWebhook.secret);

    this.webhookSecret = webhook.secret;
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
    this.config = config;
    if (config.webhookSecret) {
      this.webhookSecret = config.webhookSecret;
      this.mode = 'local';
    }
  }

  /**
   * Setup a new Stripe Webhook Endpoint.
   * - If the webhook exists, delete it and create a new one
   * - If the webhook does not exist, create a new one
   *
   * A new webhook is created and saved while holding a lock on the stored webhook, so that of
   * several Ghosts starting for one site only one creates it and the others use the one it saved.
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
    if (!id || !secret || opts.forceCreate) {
      return this.StripeWebhook.transaction(async (transacting) => {
        const stored = await this.StripeWebhook.getForUpdate(transacting);
        if (stored.webhook_id && stored.secret && stored.webhook_id !== id) {
          return {
            id: stored.webhook_id,
            secret: stored.secret,
          };
        }
        if (id && !opts.skipDelete) {
          try {
            await this.api.deleteWebhookEndpoint(id);
          } catch (err) {
            // Continue
          }
        }
        const webhook = await this.api.createWebhookEndpoint(
          this.config.webhookHandlerUrl,
          WebhookManager.events,
        );
        await this.StripeWebhook.save(
          {
            webhook_id: webhook.id,
            secret: webhook.secret,
          },
          { transacting },
        );
        return {
          id: webhook.id,
          secret: webhook.secret,
        };
      });
    } else {
      try {
        await this.api.updateWebhookEndpoint(
          id,
          this.config.webhookHandlerUrl,
          WebhookManager.events,
        );

        return {
          id,
          secret,
        };
      } catch (err) {
        if (err.code === 'resource_missing') {
          return this.setupWebhook(id, secret, { skipDelete: true, forceCreate: true });
        }
        return this.setupWebhook(id, secret, { skipDelete: false, forceCreate: true });
      }
    }
  }

  /**
   * Parse a Stripe Webhook event.
   *
   * When the signature doesn't verify with the secret in memory, another Ghost may have replaced
   * the webhook, so the event is checked once more with the stored secret.
   *
   * @param {string} body
   * @param {string} signature
   * @returns {Promise<import('stripe').Stripe.Event>}
   */
  async parseWebhook(body, signature) {
    const secret = this.webhookSecret;
    try {
      return this.parseWithSecret(body, signature, secret);
    } catch (err) {
      const storedSecret = await this.readStoredSecret();
      if (!storedSecret || storedSecret === secret) {
        throw err;
      }
      const event = this.parseWithSecret(body, signature, storedSecret);
      this.webhookSecret = storedSecret;
      return event;
    }
  }

  /**
   * @private
   * @param {string} body
   * @param {string} signature
   * @param {string|null} secret
   * @returns {import('stripe').Stripe.Event}
   */
  parseWithSecret(body, signature, secret) {
    if (!secret) {
      throw new errors.UnauthorizedError({
        code: FAILURE_CODES.webhookSecretMissing,
        message:
          "The site has no Stripe webhook secret, so it can't verify the webhook's signature.",
      });
    }
    return this.api.parseWebhook(body, signature, secret);
  }

  /**
   * Checks that fail within the interval share one read. A secret from config is never replaced,
   * so nothing is read.
   *
   * @private
   * @returns {Promise<string|null>}
   */
  async readStoredSecret() {
    if (this.mode !== 'network') {
      return null;
    }
    const now = Date.now();
    if (!this.secretRead || now - this.secretRead.at >= SECRET_READ_INTERVAL_MS) {
      this.secretRead = { at: now, secret: this.StripeWebhook.readSecret() };
    }
    return this.secretRead.secret;
  }
};
