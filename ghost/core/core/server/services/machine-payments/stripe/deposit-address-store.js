const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const {Stripe} = require('stripe');
const settingsHelpers = require('../../settings-helpers');
const settingsCache = require('../../../../shared/settings-cache');

// Preview API required for crypto deposit addresses / machine payments.
const STRIPE_MACHINE_PAYMENTS_API_VERSION = '2026-05-27.preview';
const DEPOSIT_ADDRESS_SETTING = 'machine_payments_deposit_address';

/**
 * Durable per-network deposit-address store.
 * Persists a JSON map of network → address in settings so Tempo and Base
 * rails cannot share a single chain address.
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
    }

    #addresses = {};
    #inflight = new Map();

    get settingsModel() {
        if (!this._settingsModel) {
            this._settingsModel = require('../../../models').Settings;
        }
        return this._settingsModel;
    }

    /**
     * @param {{network?: string}} [options]
     * @returns {Promise<string>}
     */
    async getOrCreateAddress({network = 'tempo'} = {}) {
        const cached = this.#addresses[network] || this.#readMap()[network];
        if (cached) {
            this.#addresses[network] = cached;
            return cached;
        }

        const inflight = this.#inflight.get(network);
        if (inflight) {
            return await inflight;
        }

        const pending = this.#createAndPersist({network})
            .finally(() => {
                this.#inflight.delete(network);
            });
        this.#inflight.set(network, pending);

        return await pending;
    }

    async #createAndPersist({network}) {
        const stripe = this.#getStripe();

        // Prefer the dedicated deposit address API when available.
        if (stripe.crypto?.depositAddresses?.create) {
            try {
                const depositAddress = await stripe.crypto.depositAddresses.create({network});
                const address = depositAddress?.address;
                if (address) {
                    await this.#persist(network, address);
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

        await this.#persist(network, address);
        return address;
    }

    #readMap() {
        const raw = this.settingsCache.get(DEPOSIT_ADDRESS_SETTING);
        if (!raw) {
            return {};
        }

        if (typeof raw === 'object' && !Array.isArray(raw)) {
            return raw;
        }

        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
            } catch {
                // Legacy single-address string — treat as Tempo-only.
            }

            return {tempo: raw};
        }

        return {};
    }

    async #persist(network, address) {
        this.#addresses[network] = address;
        const map = {
            ...this.#readMap(),
            ...this.#addresses,
            [network]: address
        };

        await this.settingsModel.edit([{
            key: DEPOSIT_ADDRESS_SETTING,
            value: JSON.stringify(map)
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
