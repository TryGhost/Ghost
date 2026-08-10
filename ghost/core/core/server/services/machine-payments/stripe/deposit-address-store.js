const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const {Stripe} = require('stripe');
const settingsHelpers = require('../../settings-helpers');
const settingsCache = require('../../../../shared/settings-cache');

// Preview API required for crypto deposit addresses / machine payments.
const STRIPE_MACHINE_PAYMENTS_API_VERSION = '2026-05-27.preview';

/**
 * Durable deposit-address store.
 * Persists the address in settings so settlement can succeed after process restarts
 * (unlike a short TTL process cache).
 */
class DepositAddressStore {
    /**
     * @param {object} [deps]
     * @param {(secretKey: string) => import('stripe').Stripe} [deps.stripeFactory]
     * @param {object} [deps.settingsHelpersFacade]
     * @param {object} [deps.settingsCacheFacade]
     * @param {object} [deps.settingsModel]
     */
    constructor({
        stripeFactory = secretKey => new Stripe(secretKey, {apiVersion: STRIPE_MACHINE_PAYMENTS_API_VERSION}),
        settingsHelpersFacade = settingsHelpers,
        settingsCacheFacade = settingsCache,
        settingsModel
    } = {}) {
        this.stripeFactory = stripeFactory;
        this.settingsHelpers = settingsHelpersFacade;
        this.settingsCache = settingsCacheFacade;
        this._settingsModel = settingsModel;
        this.stripe = null;
        this.stripeSecretKey = null;
        this.#inflight = null;
    }

    get settingsModel() {
        if (!this._settingsModel) {
            this._settingsModel = require('../../../models').Settings;
        }
        return this._settingsModel;
    }

    #inflight;

    /**
     * @param {{network?: string}} [options]
     * @returns {Promise<string>}
     */
    async getOrCreateAddress({network = 'tempo'} = {}) {
        const existing = this.settingsCache.get('machine_payments_deposit_address');
        if (existing) {
            return existing;
        }

        if (this.#inflight) {
            return await this.#inflight;
        }

        this.#inflight = this.#createAndPersist({network})
            .finally(() => {
                this.#inflight = null;
            });

        return await this.#inflight;
    }

    async #createAndPersist({network}) {
        const stripe = this.#getStripe();

        // Prefer the dedicated deposit address API when available.
        if (stripe.crypto?.depositAddresses?.create) {
            try {
                const depositAddress = await stripe.crypto.depositAddresses.create({network});
                const address = depositAddress?.address;
                if (address) {
                    await this.#persist(address);
                    return address;
                }
            } catch (err) {
                logging.warn(err);
            }
        }

        return await this.#createViaPaymentIntent({network, stripe});
    }

    async #createViaPaymentIntent({network, stripe}) {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 100,
            currency: 'usd',
            payment_method_types: ['crypto'],
            payment_method_data: {type: 'crypto'},
            payment_method_options: {
                crypto: {
                    mode: 'deposit',
                    deposit_options: {networks: [network]}
                }
            },
            confirm: true
        });

        const depositDetails = paymentIntent.next_action?.crypto_display_details;
        const address = depositDetails?.deposit_addresses?.[network]?.address;

        if (!address) {
            throw new errors.InternalServerError({
                message: 'PaymentIntent did not return expected crypto deposit details'
            });
        }

        try {
            // The deposit-mode PaymentIntent is only used to mint an address.
            // Cancel it so it does not linger as requires_action in Dashboard.
            if (typeof stripe.paymentIntents.cancel === 'function') {
                await stripe.paymentIntents.cancel(paymentIntent.id);
            }
        } catch (err) {
            logging.warn(err);
        }

        await this.#persist(address);
        return address;
    }

    async #persist(address) {
        await this.settingsModel.edit([{
            key: 'machine_payments_deposit_address',
            value: address
        }], {context: {internal: true}});
    }

    #getStripe() {
        const keys = this.settingsHelpers.getActiveStripeKeys();
        const secretKey = keys?.secretKey;

        if (!secretKey) {
            throw new errors.IncorrectUsageError({
                message: 'Stripe secret key is required for machine payments'
            });
        }

        if (this.stripe && this.stripeSecretKey === secretKey) {
            return this.stripe;
        }

        this.stripeSecretKey = secretKey;
        this.stripe = this.stripeFactory(secretKey);
        return this.stripe;
    }
}

module.exports = DepositAddressStore;
module.exports.STRIPE_MACHINE_PAYMENTS_API_VERSION = STRIPE_MACHINE_PAYMENTS_API_VERSION;
