const config = require('../../../../shared/config');
const settingsCache = require('../../../../shared/settings-cache');

const TEMPO_USDC = '0x20c000000000000000000000b9537d11c60e8b50';

function formatAmount(amount) {
    return (amount / 100).toFixed(2);
}

class MppAdapter {
    constructor({addressProvider, settingsCache: settings = settingsCache} = {}) {
        this.addressProvider = addressProvider;
        this.settingsCache = settings;
    }

    canHandle(request) {
        const authHeader = request.headers.get('authorization');
        return Boolean(authHeader && authHeader.match(/^Payment\s+/i));
    }

    async handle(request, terms, responseData) {
        const {Mppx, tempo} = require('mppx/server');
        const recipient = await this.addressProvider.getAddress({
            amount: terms.amount,
            currency: terms.currency,
            network: config.get('machinePayments:mpp:stripeNetwork') || 'tempo',
            request
        });
        const mppx = Mppx.create({
            methods: [
                tempo.charge({
                    currency: config.get('machinePayments:mpp:tempoCurrency') || TEMPO_USDC,
                    recipient,
                    testnet: config.get('machinePayments:mpp:testnet') !== false
                })
            ],
            secretKey: this.#getSecretKey()
        });

        const payment = await mppx.tempo.charge({
            amount: formatAmount(terms.amount),
            recipient
        })(request);

        if (payment.status === 402) {
            return payment.challenge;
        }

        return payment.withReceipt(new Response(responseData.body, {
            status: 200,
            headers: responseData.headers
        }));
    }

    #getSecretKey() {
        return config.get('machinePayments:mpp:secretKey') || this.settingsCache.get('theme_session_secret');
    }
}

module.exports = MppAdapter;
module.exports.TEMPO_USDC = TEMPO_USDC;
