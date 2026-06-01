const assert = require('node:assert/strict');
const sinon = require('sinon');

const logging = require('@tryghost/logging');
const settingsCache = require('../../../../../core/shared/settings-cache');
const {MachinePaymentsService} = require('../../../../../core/frontend/services/machine-payments/service');

describe('Unit: frontend/services/machine-payments/service', function () {
    let service;
    let x402Adapter;
    let mppAdapter;
    let labsService;

    beforeEach(function () {
        sinon.stub(logging, 'warn');

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
        labsService = {
            isSet: sinon.stub().withArgs('machinePayments').returns(true)
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
            labsService,
            x402Adapter,
            mppAdapter,
            defaultCurrencyProvider: sinon.stub().resolves('EUR')
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('reads enabled pricing in minor units from settings', async function () {
        assert.equal(service.isEnabled(), true);
        assert.deepEqual(await service.getTerms({url: 'https://example.com/paid.md', description: 'Paid post'}), {
            amount: 100,
            currency: 'USD',
            description: 'Paid post',
            method: 'GET',
            mimeType: 'text/markdown',
            url: 'https://example.com/paid.md'
        });
    });

    it('uses the default paid tier currency when no machine payment currency is configured', async function () {
        settingsCache.get.restore();
        sinon.stub(settingsCache, 'get').callsFake((key) => {
            if (key === 'machine_payments_enabled') {
                return true;
            }

            if (key === 'machine_payments_amount') {
                return 100;
            }

            return null;
        });

        const defaultCurrencyProvider = sinon.stub().resolves('eur');
        service = new MachinePaymentsService({
            settingsCache,
            labsService,
            x402Adapter,
            mppAdapter,
            defaultCurrencyProvider
        });

        assert.equal((await service.getTerms({url: 'https://example.com/paid.md'})).currency, 'EUR');
        sinon.assert.calledOnce(defaultCurrencyProvider);
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
            contentLocation: '/paid.md',
            description: 'Paid post'
        });

        assert.equal(response.status, 402);
        assert.equal(response.headers.get('payment-required'), 'x402-challenge');
        assert.equal(response.headers.get('WWW-Authenticate'), 'Payment id="mpp", method="tempo"');
        sinon.assert.calledWith(x402Adapter.handle, sinon.match.any, sinon.match({description: 'Paid post'}), sinon.match.any);
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
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
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
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
        sinon.assert.notCalled(x402Adapter.handle);
        sinon.assert.calledOnce(mppAdapter.handle);
    });

    it('sets no-store on non-200 credentialed payment responses', async function () {
        x402Adapter.canHandle.returns(true);
        x402Adapter.handle.resolves(new Response('payment required', {
            status: 402,
            headers: {'payment-required': 'x402-challenge'}
        }));

        const response = await service.handleRequest(new Request('https://example.com/paid.md', {
            headers: {'x-payment': 'credential'}
        }), {
            body: '# Paid',
            contentLocation: '/paid.md'
        });

        assert.equal(response.status, 402);
        assert.equal(response.headers.get('payment-required'), 'x402-challenge');
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
    });

    it('returns a controlled problem response when x402 credential verification fails', async function () {
        x402Adapter.canHandle.returns(true);
        x402Adapter.handle.rejects(new Error('x402 verification unavailable'));

        const response = await service.handleRequest(new Request('https://example.com/paid.md', {
            headers: {'x-payment': 'credential'}
        }), {
            body: '# Paid',
            contentLocation: '/paid.md'
        });

        assert.equal(response.status, 503);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
        assert.equal(response.headers.get('Content-Type'), 'application/problem+json');
        assert.match(await response.text(), /Machine payment verification is temporarily unavailable/);
        sinon.assert.calledOnce(logging.warn);
    });

    it('returns forbidden when a payment credential uses an unknown deposit address', async function () {
        const error = new Error('Invalid machine payment deposit address');
        error.statusCode = 403;
        x402Adapter.canHandle.returns(true);
        x402Adapter.handle.rejects(error);

        const response = await service.handleRequest(new Request('https://example.com/paid.md', {
            headers: {'x-payment': 'credential'}
        }), {
            body: '# Paid',
            contentLocation: '/paid.md'
        });

        assert.equal(response.status, 403);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
        assert.match(await response.text(), /Payment credential rejected/);
        sinon.assert.notCalled(logging.warn);
    });

    it('returns a partial challenge when one payment rail fails', async function () {
        x402Adapter.handle.resolves(new Response('', {
            status: 402,
            headers: {'payment-required': 'x402-challenge'}
        }));
        mppAdapter.handle.rejects(new Error('MPP unavailable'));

        const response = await service.handleRequest(new Request('https://example.com/paid.md'), {
            body: '# Paid',
            contentLocation: '/paid.md'
        });

        assert.equal(response.status, 402);
        assert.equal(response.headers.get('payment-required'), 'x402-challenge');
        assert.equal(response.headers.get('WWW-Authenticate'), null);
    });

    it('returns service unavailable when no payment rail can produce a challenge', async function () {
        x402Adapter.handle.rejects(new Error('x402 unavailable'));
        mppAdapter.handle.rejects(new Error('MPP unavailable'));

        const response = await service.handleRequest(new Request('https://example.com/paid.md'), {
            body: '# Paid',
            contentLocation: '/paid.md'
        });

        assert.equal(response.status, 503);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
        assert.match(await response.text(), /Machine payment challenges are temporarily unavailable/);
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

    it('fails closed when the machine payments labs flag is disabled', async function () {
        labsService.isSet.withArgs('machinePayments').returns(false);

        const response = await service.handleRequest(new Request('https://example.com/paid.md'), {
            body: '# Paid',
            contentLocation: '/paid.md'
        });

        assert.equal(response.status, 404);
        sinon.assert.notCalled(x402Adapter.handle);
        sinon.assert.notCalled(mppAdapter.handle);
    });
});
