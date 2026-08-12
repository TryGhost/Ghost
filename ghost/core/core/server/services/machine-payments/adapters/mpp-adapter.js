const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const config = require('../../../../shared/config');
const settingsCache = require('../../../../shared/settings-cache');
const Pricing = require('../pricing');

const TEMPO_USDC = '0x20c000000000000000000000b9537d11c60e8b50';
const TEMPO_DECIMALS = 6;
const SPT_DECIMALS = 2;

/**
 * MPP adapter (Tempo USDC + Stripe SPT/card).
 * Implements the protocol-agnostic canHandle / challenge / fulfill contract.
 */
class MppAdapter {
    /**
     * @param {object} deps
     * @param {{getOrCreateAddress: Function}} deps.depositAddressStore
     * @param {object} [deps.settingsCache]
     * @param {object} [deps.pricing]
     * @param {() => object} [deps.mppxFactory] test seam
     * @param {() => object|null} [deps.stripeClientFactory] test seam
     */
    constructor({
        depositAddressStore,
        settingsCache: settings = settingsCache,
        pricing = new Pricing({settingsCache: settings}),
        mppxFactory,
        stripeClientFactory
    }) {
        this.depositAddressStore = depositAddressStore;
        this.settingsCache = settings;
        this.pricing = pricing;
        this.mppxFactory = mppxFactory;
        this.stripeClientFactory = stripeClientFactory;
        this.name = 'mpp';
    }

    #mppx = null;
    #mppxKey = null;
    #replayStore = null;

    canHandle(request) {
        const authHeader = request.headers.get('authorization');
        return Boolean(authHeader && /^Payment\s+/i.test(authHeader));
    }

    async challenge(request, terms) {
        const payment = await this.#run(request, terms);
        if (payment.status === 402) {
            return payment.challenge;
        }
        // Unexpected success without credential — treat as challenge unavailable.
        return null;
    }

    async fulfill(request, terms) {
        const payment = await this.#run(request, terms);
        if (payment.status === 402) {
            throw new errors.NoPermissionError({
                message: 'Payment required'
            });
        }

        if (payment.status !== 200 || typeof payment.withReceipt !== 'function') {
            throw new errors.NoPermissionError({
                message: 'Machine payment credential rejected'
            });
        }

        const wrapped = payment.withReceipt(new Response('', {status: 200}));
        const receiptHeader = wrapped.headers.get('payment-receipt');
        const receipt = parseReceipt(receiptHeader);
        if (!receipt.reference) {
            throw new errors.InternalServerError({
                message: 'Machine payment succeeded without a stable settlement reference'
            });
        }

        return {
            protocol: 'mpp',
            method: receipt.method,
            reference: receipt.reference,
            amount: terms.amount,
            currency: terms.currency,
            stripePaymentIntentId: receipt.method === 'stripe' ? receipt.reference : null,
            receiptHeaders: receiptHeader ? {'payment-receipt': receiptHeader} : {}
        };
    }

    async #run(request, terms) {
        const {Mppx, tempo, stripe: mppStripe, Store} = this.mppxFactory
            ? this.mppxFactory()
            : require('mppx/server');

        const profileId = this.settingsCache.get('machine_payments_stripe_profile_id')
            || config.get('machinePayments:mpp:networkId');
        const stripeClient = this.#getStripeClient();
        const hasStripe = Boolean(stripeClient && profileId);

        let recipient = null;
        try {
            recipient = await this.depositAddressStore.getOrCreateAddress({
                network: config.get('machinePayments:mpp:stripeNetwork') || 'tempo'
            });
        } catch (err) {
            logging.warn(err);
        }
        const hasTempo = Boolean(recipient);

        if (!hasTempo && !hasStripe) {
            throw new errors.InternalServerError({
                message: 'Machine payment challenges are temporarily unavailable'
            });
        }

        if (!this.#replayStore) {
            this.#replayStore = Store.memory();
        }

        const secretKey = this.#getSecretKey();
        const tempoCurrency = config.get('machinePayments:mpp:tempoCurrency') || TEMPO_USDC;
        const testnet = config.get('machinePayments:mpp:testnet') === true;
        const key = `${secretKey}:${recipient || ''}:${hasStripe ? profileId : ''}:${tempoCurrency}:${testnet}`;

        if (!this.#mppx || this.#mppxKey !== key) {
            const methods = [];
            if (hasTempo) {
                methods.push(tempo.charge({
                    currency: tempoCurrency,
                    recipient,
                    testnet,
                    decimals: TEMPO_DECIMALS,
                    store: this.#replayStore
                }));
            }
            if (hasStripe) {
                methods.push(mppStripe.charge({
                    client: stripeClient,
                    networkId: profileId,
                    paymentMethodTypes: ['card', 'link'],
                    decimals: SPT_DECIMALS
                }));
            }
            this.#mppx = Mppx.create({methods, secretKey});
            this.#mppxKey = key;
        }

        const scope = new URL(request.url).pathname;
        const tempoCharge = hasTempo
            ? {amount: this.pricing.forTempoUsdc(terms).majorAmount, recipient, scope}
            : null;
        const sptTerms = hasStripe ? this.pricing.forSpt(terms) : null;
        const stripeCharge = sptTerms
            ? {amount: sptTerms.majorAmount, currency: sptTerms.currency, scope}
            : null;

        if (tempoCharge && stripeCharge) {
            return await this.#mppx.compose(
                ['tempo/charge', tempoCharge],
                ['stripe/charge', stripeCharge]
            )(request);
        }

        if (stripeCharge) {
            return await this.#mppx.stripe.charge(stripeCharge)(request);
        }

        return await this.#mppx.tempo.charge(tempoCharge)(request);
    }

    #getSecretKey() {
        return config.get('machinePayments:mpp:secretKey')
            || this.settingsCache.get('machine_payments_secret');
    }

    #getStripeClient() {
        if (this.stripeClientFactory) {
            return this.stripeClientFactory();
        }

        try {
            const settingsHelpers = require('../../settings-helpers');
            const keys = settingsHelpers.getActiveStripeKeys();
            if (!keys?.secretKey) {
                return null;
            }
            const {Stripe} = require('stripe');
            const {STRIPE_MACHINE_PAYMENTS_API_VERSION} = require('../stripe/deposit-address-store');
            return new Stripe(keys.secretKey, {apiVersion: STRIPE_MACHINE_PAYMENTS_API_VERSION});
        } catch {
            return null;
        }
    }
}

/**
 * mppx serializes Payment-Receipt as unpadded base64url JSON
 * `{method, reference, status, timestamp}`.
 */
function parseReceipt(header) {
    if (!header) {
        return {};
    }

    try {
        const parsed = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

module.exports = MppAdapter;
module.exports.TEMPO_USDC = TEMPO_USDC;
module.exports.TEMPO_DECIMALS = TEMPO_DECIMALS;
module.exports.parseReceipt = parseReceipt;
