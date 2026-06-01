const assert = require('node:assert/strict');
const sinon = require('sinon');
const supertest = require('supertest');

const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');
const labs = require('../../core/shared/labs');
const machinePaymentsService = require('../../core/frontend/services/machine-payments/service');

function assertCorrectFrontendHeaders(res) {
    assert.equal(res.headers['x-cache-invalidate'], undefined);
    assert.equal(res.headers['x-csrf-token'], undefined);
    assert.equal(res.headers['set-cookie'], undefined);
    assert.ok(res.headers.date);
}

describe('LLMS frontend routes', function () {
    let request;
    let enabledLabs;

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(configUtils.config.get('url'));
    });

    beforeEach(function () {
        enabledLabs = new Set(['llmsTxt']);
        sinon.stub(labs, 'isSet').callsFake(flag => enabledLabs.has(flag));
    });

    afterEach(function () {
        sinon.restore();
    });

    it('serves /llms.txt with discovery headers', async function () {
        const res = await request.get('/llms.txt')
            .expect(200)
            .expect('Cache-Control', testUtils.cacheRules.hour)
            .expect('Content-Type', /text\/plain/)
            .expect('X-Llms-Txt', '/llms.txt')
            .expect(assertCorrectFrontendHeaders);

        assert.match(res.headers.link, /<\/llms\.txt>; rel="llms-txt"/);
        assert.match(res.headers.link, /<\/llms-full\.txt>; rel="llms-full-txt"/);
        assert.match(res.text, /^# /m);
        assert.match(res.text, /\[.*\]\(http:\/\/127\.0\.0\.1:\d+\/welcome\.md\)/);
        assert.doesNotMatch(res.text, /RSS Feed/);
        assert.doesNotMatch(res.text, /Sitemap/);
    });

    it('serves /.well-known/llms.txt as an alias', async function () {
        const [rootRes, aliasRes] = await Promise.all([
            request.get('/llms.txt'),
            request.get('/.well-known/llms.txt')
        ]);

        assert.equal(aliasRes.status, 200);
        assert.equal(aliasRes.text, rootRes.text);
    });

    it('serves /llms-full.txt', async function () {
        const res = await request.get('/llms-full.txt')
            .expect(200)
            .expect('Cache-Control', testUtils.cacheRules.hour)
            .expect('Content-Type', /text\/plain/)
            .expect(assertCorrectFrontendHeaders);

        assert.match(res.text, /## Start here for a quick overview of everything you need to know/);
        assert.match(res.text, /URL: http:\/\/127\.0\.0\.1:\d+\/welcome\//);
    });

    it('serves markdown for a public post via .md URL', async function () {
        const res = await request.get('/welcome.md')
            .expect(200)
            .expect('Content-Type', /text\/markdown/)
            .expect('Content-Location', '/welcome.md')
            .expect('X-Llms-Txt', '/llms.txt')
            .expect(assertCorrectFrontendHeaders);

        assert.match(res.text, /^# Start here for a quick overview of everything you need to know/m);
        assert.match(res.text, /> Fetch the complete content index at: http:\/\/127\.0\.0\.1:\d+\/llms\.txt/);
        assert.match(res.text, /- Published: /);
    });

    it('outputs a markdown alternate link on public post pages', async function () {
        const res = await request.get('/welcome/')
            .expect(200)
            .expect('Content-Type', /text\/html/)
            .expect(assertCorrectFrontendHeaders);

        assert.match(res.text, /<link rel="alternate" type="text\/markdown" href="http:\/\/127\.0\.0\.1:\d+\/welcome\.md">/);
    });

    it('serves a machine payment challenge for paid post markdown URLs', async function () {
        const originalSettingsCacheGet = settingsCache.get;
        const originalAddressProvider = machinePaymentsService.x402Adapter.addressProvider;
        const originalFacilitatorClient = machinePaymentsService.x402Adapter.facilitatorClient;
        const addressProvider = {
            getAddress: sinon.stub().resolves('0x0000000000000000000000000000000000000001')
        };

        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'machine_payments_enabled') {
                return true;
            }

            if (key === 'machine_payments_currency') {
                return 'USD';
            }

            if (key === 'machine_payments_amount') {
                return 100;
            }

            return originalSettingsCacheGet.call(this, key, options);
        });
        enabledLabs.add('machinePayments');

        machinePaymentsService.x402Adapter.addressProvider = addressProvider;
        machinePaymentsService.x402Adapter.facilitatorClient = {
            getSupported: sinon.stub().resolves({
                kinds: [{
                    x402Version: 2,
                    scheme: 'exact',
                    network: 'eip155:8453'
                }],
                extensions: [],
                signers: {}
            }),
            verify: sinon.stub().resolves({isValid: false}),
            settle: sinon.stub().resolves({success: false, transaction: '0x0', network: 'eip155:8453'})
        };

        try {
            const res = await request.get('/sell.md')
                .expect(402)
                .expect('Content-Type', /application\/problem\+json/)
                .expect(assertCorrectFrontendHeaders);

            assert.match(res.text, /Payment Required/);
            assert.ok(res.headers['payment-required']);
            sinon.assert.calledWith(addressProvider.getAddress, sinon.match({
                amount: 100,
                currency: 'USD',
                network: 'base'
            }));
        } finally {
            machinePaymentsService.x402Adapter.addressProvider = originalAddressProvider;
            machinePaymentsService.x402Adapter.facilitatorClient = originalFacilitatorClient;
        }
    });

    it('serves markdown for a public post via Accept negotiation on the canonical URL', async function () {
        const res = await request.get('/welcome/')
            .set('Accept', 'text/markdown')
            .expect(200)
            .expect('Content-Type', /text\/markdown/)
            .expect(assertCorrectFrontendHeaders);

        assert.match(res.text, /^# Start here for a quick overview of everything you need to know/m);
    });

    it('respects private-site behavior for llms routes', async function () {
        const originalSettingsCacheGet = settingsCache.get;

        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'is_private') {
                return true;
            }

            return originalSettingsCacheGet.call(this, key, options);
        });

        await request.get('/llms.txt')
            .expect(302)
            .expect('Location', '/private/?r=%2Fllms.txt')
            .expect(assertCorrectFrontendHeaders);
    });

    it('disables llms routes and discovery headers when llms_enabled is false', async function () {
        const originalSettingsCacheGet = settingsCache.get;

        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'llms_enabled') {
                return false;
            }

            return originalSettingsCacheGet.call(this, key, options);
        });

        await request.get('/llms.txt')
            .expect(302)
            .expect('Location', '/')
            .expect(assertCorrectFrontendHeaders);

        await request.get('/welcome.md')
            .expect(302)
            .expect('Location', '/welcome/')
            .expect(assertCorrectFrontendHeaders);

        const res = await request.get('/welcome/')
            .expect(200)
            .expect(assertCorrectFrontendHeaders);

        assert.equal(res.headers['x-llms-txt'], undefined);
        assert.ok(!res.headers.link || !res.headers.link.includes('rel="llms-txt"'));
    });
});
