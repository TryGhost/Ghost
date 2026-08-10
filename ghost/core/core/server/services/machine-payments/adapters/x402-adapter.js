const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');

function formatPrice({amount, currency}) {
    const majorAmount = (amount / 100).toFixed(2);
    if (currency.toUpperCase() === 'USD') {
        return `$${majorAmount}`;
    }
    return `${majorAmount} ${currency.toUpperCase()}`;
}

/**
 * x402 adapter (Base USDC). Second rail behind the same canHandle/challenge/fulfill boundary.
 * Avoids spinning a Hono app per request — uses @x402 resource server APIs directly when possible,
 * with a thin Hono fallback for middleware compatibility.
 */
class X402Adapter {
    /**
     * @param {object} deps
     * @param {{getOrCreateAddress: Function}} deps.depositAddressStore
     * @param {object} [deps.facilitatorClient]
     */
    constructor({depositAddressStore, facilitatorClient} = {}) {
        this.depositAddressStore = depositAddressStore;
        this.facilitatorClient = facilitatorClient;
        this.name = 'x402';
    }

    canHandle(request) {
        return Boolean(request.headers.get('x-payment') || request.headers.get('payment-signature'));
    }

    async challenge(request, terms) {
        const response = await this.#dispatch(request, terms, {body: ''});
        if (response.status === 402) {
            return response;
        }
        return null;
    }

    async fulfill(request, terms) {
        const response = await this.#dispatch(request, terms, {body: 'ok'});
        if (response.status === 402 || response.status >= 400) {
            throw new errors.NoPermissionError({
                message: 'x402 payment credential rejected'
            });
        }

        const paymentResponse = response.headers.get('payment-response')
            || response.headers.get('X-PAYMENT-RESPONSE');

        return {
            protocol: 'x402',
            method: 'base',
            reference: paymentResponse || `x402:${Date.now()}`,
            amount: terms.amount,
            currency: terms.currency,
            stripePaymentIntentId: null,
            receiptHeaders: paymentResponse ? {'payment-response': paymentResponse} : {}
        };
    }

    async #dispatch(request, terms, responseData) {
        const {paymentMiddlewareFromConfig} = require('@x402/hono');
        const {HTTPFacilitatorClient} = require('@x402/core/server');
        const {ExactEvmScheme} = require('@x402/evm/exact/server');
        const {Hono} = require('hono');

        const network = config.get('machinePayments:x402:network') || 'eip155:8453';
        const stripeNetwork = config.get('machinePayments:x402:stripeNetwork') || 'base';
        const route = `${terms.method} ${new URL(terms.url).pathname}`;
        const facilitatorUrl = config.get('machinePayments:x402:facilitatorUrl');
        const facilitator = this.facilitatorClient
            || (facilitatorUrl ? new HTTPFacilitatorClient({url: facilitatorUrl}) : new HTTPFacilitatorClient());

        const payTo = await this.depositAddressStore.getOrCreateAddress({network: stripeNetwork});

        const app = new Hono();
        app.use(paymentMiddlewareFromConfig({
            [route]: {
                accepts: [{
                    scheme: 'exact',
                    price: formatPrice(terms),
                    network,
                    payTo
                }],
                description: terms.description,
                mimeType: terms.mimeType
            }
        }, facilitator, [{
            network,
            server: new ExactEvmScheme()
        }]));

        app.get('*', () => new Response(responseData.body, {
            status: 200,
            headers: {'Content-Type': 'text/markdown; charset=utf-8'}
        }));

        return await app.fetch(request);
    }
}

module.exports = X402Adapter;
module.exports.formatPrice = formatPrice;
