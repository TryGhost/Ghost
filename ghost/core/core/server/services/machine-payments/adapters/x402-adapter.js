const crypto = require('node:crypto');
const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');

function formatPrice({amount, currency}) {
    if (currency.toUpperCase() !== 'USD') {
        throw new errors.ValidationError({
            message: 'x402 machine payments currently support USD only'
        });
    }

    return `$${(amount / 100).toFixed(2)}`;
}

/**
 * Stable ledger reference from an x402 PAYMENT-RESPONSE header.
 * The raw header is base64 JSON and overflows varchar(255); prefer the
 * settlement transaction hash, and hash the header if that is missing.
 * @param {string} paymentResponse
 * @returns {string}
 */
function settlementReference(paymentResponse) {
    const decoded = decodeJsonHeader(paymentResponse);
    const reference = decoded?.transaction
        || decoded?.txHash
        || decoded?.hash
        || decoded?.settlement?.transaction;

    if (typeof reference === 'string' && reference.length > 0 && reference.length <= 255) {
        return reference;
    }

    if (typeof paymentResponse === 'string' && paymentResponse.length <= 255) {
        return paymentResponse;
    }

    return crypto.createHash('sha256').update(String(paymentResponse)).digest('hex');
}

function decodeJsonHeader(header) {
    if (!header) {
        return null;
    }

    for (const encoding of ['base64url', 'base64']) {
        try {
            return JSON.parse(Buffer.from(header, encoding).toString('utf8'));
        } catch {
            // try the next encoding
        }
    }

    try {
        return JSON.parse(header);
    } catch {
        return null;
    }
}

/**
 * x402 adapter (Base USDC). Second rail behind the same canHandle/challenge/fulfill boundary.
 * Uses a thin Hono app for @x402 middleware compatibility.
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
        if (!paymentResponse) {
            throw new errors.InternalServerError({
                message: 'x402 payment succeeded without a stable settlement reference'
            });
        }

        return {
            protocol: 'x402',
            method: 'base',
            reference: settlementReference(paymentResponse),
            amount: terms.amount,
            currency: terms.currency,
            stripePaymentIntentId: null,
            receiptHeaders: {'payment-response': paymentResponse}
        };
    }

    async #dispatch(request, terms, responseData) {
        const {paymentMiddlewareFromConfig} = require('@x402/hono');
        const {HTTPFacilitatorClient} = require('@x402/core/server');
        const {ExactEvmScheme} = require('@x402/evm/exact/server');
        const {Hono} = require('hono');

        const network = config.get('machinePayments:x402:network') || 'eip155:8453';
        const stripeNetwork = config.get('machinePayments:x402:stripeNetwork') || 'base';
        const method = (terms.method || 'GET').toUpperCase();
        const route = `${method} ${new URL(terms.url).pathname}`;
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

        const handler = () => new Response(responseData.body, {
            status: 200,
            headers: {'Content-Type': 'text/markdown; charset=utf-8'}
        });

        if (method === 'GET') {
            app.get('*', handler);
        } else if (method === 'HEAD') {
            app.on('HEAD', '*', handler);
        } else {
            app.on(method, '*', handler);
        }

        return await app.fetch(request);
    }
}

module.exports = X402Adapter;
module.exports.formatPrice = formatPrice;
module.exports.settlementReference = settlementReference;
