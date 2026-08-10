const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');
const settingsCache = require('../../../../shared/settings-cache');
const Pricing = require('../pricing');

const TEMPO_USDC = '0x20c000000000000000000000b9537d11c60e8b50';

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
     */
    constructor({
        depositAddressStore,
        settingsCache: settings = settingsCache,
        pricing = new Pricing({settingsCache: settings}),
        mppxFactory
    }) {
        this.depositAddressStore = depositAddressStore;
        this.settingsCache = settings;
        this.pricing = pricing;
        this.mppxFactory = mppxFactory;
        this.name = 'mpp';
    }

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

        if (!payment.status || payment.status >= 400) {
            throw new errors.NoPermissionError({
                message: 'Machine payment credential rejected'
            });
        }

        const receipt = payment.receipt || {};
        const reference = receipt.reference || receipt.id || receipt.paymentIntentId || receipt.stripePaymentIntentId;
        if (!reference) {
            throw new errors.InternalServerError({
                message: 'Machine payment succeeded without a stable settlement reference'
            });
        }

        return {
            protocol: 'mpp',
            method: receipt.method || (receipt.reference ? 'tempo' : 'spt'),
            reference,
            amount: terms.amount,
            currency: terms.currency,
            stripePaymentIntentId: receipt.paymentIntentId || receipt.stripePaymentIntentId || null,
            receiptHeaders: this.#receiptHeaders(payment)
        };
    }

    async #run(request, terms) {
        const {Mppx, tempo, stripe: mppStripe} = this.mppxFactory
            ? this.mppxFactory()
            : require('mppx/server');

        const network = config.get('machinePayments:mpp:stripeNetwork') || 'tempo';
        const recipient = await this.depositAddressStore.getOrCreateAddress({network});
        const tempoTerms = this.pricing.forTempoUsdc(terms);
        const sptTerms = this.pricing.forSpt(terms);
        const profileId = this.settingsCache.get('machine_payments_stripe_profile_id')
            || config.get('machinePayments:mpp:networkId');

        const methods = [
            tempo.charge({
                currency: config.get('machinePayments:mpp:tempoCurrency') || TEMPO_USDC,
                recipient,
                testnet: config.get('machinePayments:mpp:testnet') === true,
                decimals: 2
            })
        ];

        const stripeClient = this.#getStripeClient();
        if (stripeClient && profileId) {
            methods.push(mppStripe.charge({
                client: stripeClient,
                networkId: profileId,
                paymentMethodTypes: ['card', 'link'],
                decimals: 2
            }));
        }

        const mppx = Mppx.create({
            methods,
            secretKey: this.#getSecretKey()
        });

        // Prefer compose when SPT is configured so agents see both challenges.
        if (stripeClient && profileId && mppx.stripe) {
            const {Mppx: MppxNs} = this.mppxFactory
                ? this.mppxFactory()
                : require('mppx/server');

            if (typeof MppxNs.compose === 'function') {
                return await MppxNs.compose(
                    mppx.tempo.charge({amount: tempoTerms.majorAmount, recipient}),
                    mppx.stripe.charge({amount: sptTerms.majorAmount, currency: sptTerms.currency})
                )(request);
            }
        }

        return await mppx.tempo.charge({
            amount: tempoTerms.majorAmount,
            recipient
        })(request);
    }

    #getSecretKey() {
        return config.get('machinePayments:mpp:secretKey')
            || this.settingsCache.get('machine_payments_secret');
    }

    #getStripeClient() {
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

    #receiptHeaders(payment) {
        const headers = {};
        if (payment.headers?.get) {
            const paymentResponse = payment.headers.get('payment-response')
                || payment.headers.get('Payment-Response');
            if (paymentResponse) {
                headers['payment-response'] = paymentResponse;
            }
        }
        return headers;
    }
}

module.exports = MppAdapter;
module.exports.TEMPO_USDC = TEMPO_USDC;
