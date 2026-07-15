const config = require('../../../../shared/config');

function formatPrice({amount, currency}) {
    const majorAmount = (amount / 100).toFixed(2);

    if (currency.toUpperCase() === 'USD') {
        return `$${majorAmount}`;
    }

    return `${majorAmount} ${currency.toUpperCase()}`;
}

class X402Adapter {
    constructor({addressProvider, facilitatorClient} = {}) {
        this.addressProvider = addressProvider;
        this.facilitatorClient = facilitatorClient;
    }

    canHandle(request) {
        return Boolean(request.headers.get('x-payment') || request.headers.get('payment-signature'));
    }

    async handle(request, terms, responseData) {
        const {Hono} = require('hono');
        const {paymentMiddlewareFromConfig} = require('@x402/hono');
        const {HTTPFacilitatorClient} = require('@x402/core/server');
        const {ExactEvmScheme} = require('@x402/evm/exact/server');

        const network = config.get('machinePayments:x402:network') || 'eip155:8453';
        const stripeNetwork = config.get('machinePayments:x402:stripeNetwork') || 'base';
        const route = `${terms.method} ${new URL(terms.url).pathname}`;
        const facilitatorUrl = config.get('machinePayments:x402:facilitatorUrl');
        const facilitator = this.facilitatorClient || (facilitatorUrl ? new HTTPFacilitatorClient({url: facilitatorUrl}) : new HTTPFacilitatorClient());
        const app = new Hono();

        app.use(paymentMiddlewareFromConfig({
            [route]: {
                accepts: [{
                    scheme: 'exact',
                    price: formatPrice(terms),
                    network,
                    payTo: async (context) => {
                        return await this.addressProvider.getAddress({
                            amount: terms.amount,
                            currency: terms.currency,
                            network: stripeNetwork,
                            paymentHeader: context.paymentHeader
                        });
                    }
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
            headers: responseData.headers
        }));

        return await app.fetch(request);
    }
}

module.exports = X402Adapter;
module.exports.formatPrice = formatPrice;
