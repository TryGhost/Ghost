const assert = require('node:assert/strict');
const sinon = require('sinon');

const configUtils = require('../../../../utils/config-utils');
const X402Adapter = require('../../../../../core/frontend/services/machine-payments/adapters/x402-adapter');
const MppAdapter = require('../../../../../core/frontend/services/machine-payments/adapters/mpp-adapter');

describe('Unit: frontend/services/machine-payments/adapters', function () {
    const terms = {
        amount: 100,
        currency: 'USD',
        description: 'Markdown content',
        method: 'GET',
        mimeType: 'text/markdown',
        url: 'https://example.com/paid.md'
    };
    const paidResponse = {
        body: '# Paid',
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8'
        }
    };

    afterEach(function () {
        configUtils.restore();
        sinon.restore();
    });

    it('builds an x402 payment-required challenge for paid markdown', async function () {
        const addressProvider = {
            getAddress: sinon.stub().resolves('0x0000000000000000000000000000000000000001')
        };
        const facilitatorClient = {
            getSupported: sinon.stub().resolves({
                kinds: [{
                    x402Version: 2,
                    scheme: 'exact',
                    network: 'eip155:84532'
                }],
                extensions: [],
                signers: {}
            }),
            verify: sinon.stub().resolves({isValid: false}),
            settle: sinon.stub().resolves({success: false, transaction: '0x0', network: 'eip155:84532'})
        };
        const adapter = new X402Adapter({addressProvider, facilitatorClient});

        const response = await adapter.handle(new Request('https://example.com/paid.md'), terms, paidResponse);

        assert.equal(response.status, 402);
        assert.ok(response.headers.get('payment-required'));
        sinon.assert.calledWith(addressProvider.getAddress, sinon.match({
            amount: 100,
            currency: 'USD',
            network: 'base'
        }));
    });

    it('builds an MPP tempo payment challenge for paid markdown', async function () {
        configUtils.set('machinePayments:mpp:secretKey', 'test-machine-payments-secret');

        const addressProvider = {
            getAddress: sinon.stub().resolves('0x0000000000000000000000000000000000000001')
        };
        const adapter = new MppAdapter({addressProvider});

        const response = await adapter.handle(new Request('https://example.com/paid.md'), terms, paidResponse);

        assert.equal(response.status, 402);
        assert.match(response.headers.get('WWW-Authenticate'), /^Payment /);
        assert.match(response.headers.get('WWW-Authenticate'), /method="tempo"/);
        sinon.assert.calledWith(addressProvider.getAddress, sinon.match({
            amount: 100,
            currency: 'USD',
            network: 'tempo'
        }));
    });
});
