const assert = require('node:assert/strict');
const {formatPrice} = require('../../../../../core/server/services/machine-payments/adapters/x402-adapter');
const {TEMPO_USDC} = require('../../../../../core/server/services/machine-payments/adapters/mpp-adapter');

describe('Unit: server/services/machine-payments/adapters', function () {
    it('formats USD x402 prices with a dollar prefix', function () {
        assert.equal(formatPrice({amount: 100, currency: 'USD'}), '$1.00');
    });

    it('formats non-USD x402 prices with a currency suffix', function () {
        assert.equal(formatPrice({amount: 250, currency: 'EUR'}), '2.50 EUR');
    });

    it('exports the Tempo USDC contract address', function () {
        assert.match(TEMPO_USDC, /^0x[0-9a-f]+$/i);
    });
});
