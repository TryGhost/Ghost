const assert = require('node:assert/strict');
const {formatPrice} = require('../../../../../core/server/services/machine-payments/adapters/x402-adapter');
const {TEMPO_USDC} = require('../../../../../core/server/services/machine-payments/adapters/mpp-adapter');

describe('Unit: server/services/machine-payments/adapters', function () {
    it('formats USD x402 prices with a dollar prefix', function () {
        assert.equal(formatPrice({amount: 100, currency: 'USD'}), '$1.00');
    });

    it('rejects non-USD x402 prices', function () {
        assert.throws(
            () => formatPrice({amount: 250, currency: 'EUR'}),
            /USD only/
        );
    });

    it('exports the Tempo USDC contract address', function () {
        assert.equal(TEMPO_USDC, '0x20c000000000000000000000b9537d11c60e8b50');
    });
});
