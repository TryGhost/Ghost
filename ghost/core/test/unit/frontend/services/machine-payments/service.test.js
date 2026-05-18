const assert = require('node:assert/strict');
const sinon = require('sinon');

const settingsCache = require('../../../../../core/shared/settings-cache');
const {MachinePaymentsService} = require('../../../../../core/frontend/services/machine-payments/service');

describe('Unit: frontend/services/machine-payments/service', function () {
    let service;
    let x402Adapter;
    let mppAdapter;

    beforeEach(function () {
        x402Adapter = {
            canHandle: sinon.stub().returns(false),
            handle: sinon.stub().resolves(new Response('paid', {
                status: 200,
                headers: {'payment-response': 'x402-receipt'}
            }))
        };

        mppAdapter = {
            canHandle: sinon.stub().returns(false),
            handle: sinon.stub().resolves(new Response('paid', {
                status: 200,
                headers: {receipt: 'mpp-receipt'}
            }))
        };

        sinon.stub(settingsCache, 'get').callsFake((key) => {
            if (key === 'machine_payments_enabled') {
                return true;
            }

            if (key === 'machine_payments_currency') {
                return 'USD';
            }

            if (key === 'machine_payments_amount') {
                return 100;
            }

            return null;
        });

        service = new MachinePaymentsService({
            settingsCache,
            x402Adapter,
            mppAdapter
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('reads enabled pricing in minor units from settings', function () {
        assert.equal(service.isEnabled(), true);
        assert.deepEqual(service.getTerms({url: 'https://example.com/paid.md'}), {
            amount: 100,
            currency: 'USD',
            description: 'Markdown content',
            method: 'GET',
            mimeType: 'text/markdown',
            url: 'https://example.com/paid.md'
        });
    });

    it('returns a combined x402 and MPP challenge when no credential is supplied', async function () {
        x402Adapter.handle.resolves(new Response('', {
            status: 402,
            headers: {'payment-required': 'x402-challenge'}
        }));

        mppAdapter.handle.resolves(new Response(JSON.stringify({status: 402}), {
            status: 402,
            headers: {'WWW-Authenticate': 'Payment id="mpp", method="tempo"'}
        }));

        const response = await service.handleRequest(new Request('https://example.com/paid.md'), {
            body: '# Paid',
            contentLocation: '/paid.md'
        });

        assert.equal(response.status, 402);
        assert.equal(response.headers.get('payment-required'), 'x402-challenge');
        assert.equal(response.headers.get('WWW-Authenticate'), 'Payment id="mpp", method="tempo"');
        assert.match(await response.text(), /Payment Required/);
    });

    it('uses x402 when an x-payment credential is supplied', async function () {
        x402Adapter.canHandle.returns(true);

        const response = await service.handleRequest(new Request('https://example.com/paid.md', {
            headers: {'x-payment': 'credential'}
        }), {
            body: '# Paid',
            contentLocation: '/paid.md'
        });

        assert.equal(response.status, 200);
        assert.equal(response.headers.get('payment-response'), 'x402-receipt');
        sinon.assert.calledOnce(x402Adapter.handle);
        sinon.assert.notCalled(mppAdapter.handle);
    });

    it('uses MPP when an Authorization Payment credential is supplied', async function () {
        mppAdapter.canHandle.returns(true);

        const response = await service.handleRequest(new Request('https://example.com/paid.md', {
            headers: {authorization: 'Payment credential'}
        }), {
            body: '# Paid',
            contentLocation: '/paid.md'
        });

        assert.equal(response.status, 200);
        assert.equal(response.headers.get('receipt'), 'mpp-receipt');
        sinon.assert.notCalled(x402Adapter.handle);
        sinon.assert.calledOnce(mppAdapter.handle);
    });

    it('fails closed when machine payments are disabled', async function () {
        settingsCache.get.restore();
        sinon.stub(settingsCache, 'get').callsFake(key => (key === 'machine_payments_enabled' ? false : null));

        const response = await service.handleRequest(new Request('https://example.com/paid.md'), {
            body: '# Paid',
            contentLocation: '/paid.md'
        });

        assert.equal(response.status, 404);
    });
});
