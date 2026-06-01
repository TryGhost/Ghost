const TTLCache = require('@isaacs/ttlcache');
const errors = require('@tryghost/errors');
const {Stripe} = require('stripe');
const crypto = require('crypto');

const settingsHelpers = require('../../../server/services/settings-helpers');

const STRIPE_MACHINE_PAYMENTS_API_VERSION = '2026-03-04.preview';

class StripeDepositAddressProvider {
    constructor({cache, stripeFactory = secretKey => new Stripe(secretKey, {apiVersion: STRIPE_MACHINE_PAYMENTS_API_VERSION})} = {}) {
        this.cache = cache || new TTLCache({ttl: 300000});
        this.stripeFactory = stripeFactory;
        this.stripe = null;
        this.stripeSecretKey = null;
        this.stripeCacheNamespace = null;
    }

    async getAddress({amount, currency, network, paymentHeader, request}) {
        const stripe = this.#getStripe();
        const cacheNamespace = this.stripeCacheNamespace;
        const cachedAddress = await this.#getCachedAddressFromCredential({paymentHeader, request});

        if (cachedAddress) {
            return cachedAddress;
        }

        const cacheKey = this.#getDepositAddressCacheKey({amount, currency, network, cacheNamespace});
        const pendingAddress = this.cache.get(cacheKey);

        if (pendingAddress) {
            return pendingAddress;
        }

        return await this.#createAddress({amount, currency, network, cacheKey, cacheNamespace, stripe});
    }

    async #getCachedAddressFromCredential({paymentHeader, request}) {
        const address = paymentHeader
            ? this.#extractX402Address(paymentHeader)
            : await this.#extractMppAddress(request);

        if (!address) {
            return null;
        }

        if (!this.cache.has(this.#getAddressCacheKey({address, cacheNamespace: this.stripeCacheNamespace}))) {
            throw new errors.NoPermissionError({
                message: 'Invalid machine payment deposit address'
            });
        }

        return address;
    }

    #extractX402Address(paymentHeader) {
        try {
            const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
            return decoded.payload?.authorization?.to || null;
        } catch {
            return null;
        }
    }

    async #extractMppAddress(request) {
        const authHeader = request?.headers?.get('authorization');

        if (!authHeader) {
            return null;
        }

        const {Credential} = require('mppx');

        if (!Credential.extractPaymentScheme(authHeader)) {
            return null;
        }

        const credential = Credential.fromRequest(request);
        return credential.challenge?.request?.recipient || null;
    }

    async #createAddress({amount, currency, network, cacheKey, cacheNamespace, stripe}) {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: currency.toLowerCase(),
            payment_method_types: ['crypto'],
            payment_method_data: {
                type: 'crypto'
            },
            payment_method_options: {
                crypto: {
                    mode: 'deposit',
                    deposit_options: {
                        networks: [network]
                    }
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

        this.cache.set(this.#getAddressCacheKey({address, cacheNamespace}), true);
        this.cache.set(cacheKey, address);
        return address;
    }

    #getDepositAddressCacheKey({amount, currency, network, cacheNamespace}) {
        return `${cacheNamespace}:deposit-address:${amount}:${currency.toLowerCase()}:${network}`;
    }

    #getAddressCacheKey({address, cacheNamespace}) {
        return `${cacheNamespace}:address:${address}`;
    }

    #getStripe() {
        const keys = settingsHelpers.getActiveStripeKeys();
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
        this.stripeCacheNamespace = crypto.createHash('sha256').update(secretKey).digest('hex').slice(0, 16);
        this.stripe = this.stripeFactory(secretKey);
        return this.stripe;
    }
}

module.exports = StripeDepositAddressProvider;
module.exports.STRIPE_MACHINE_PAYMENTS_API_VERSION = STRIPE_MACHINE_PAYMENTS_API_VERSION;
