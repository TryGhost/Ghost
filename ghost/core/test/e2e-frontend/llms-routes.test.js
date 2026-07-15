// # llms.txt Frontend Routing Tests
// The llms service fetches content through the public Posts/Pages API with
// narrowed `fields` + `formats` options. These tests boot a full Ghost
// instance so the request runs through the real controllers and serializers,
// covering the fields/formats/url interaction the unit tests mock away.
const assert = require('node:assert/strict');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');
const machinePaymentsService = require('../../core/server/services/machine-payments/service');

describe('llms.txt routing', function () {
    let request;
    let siteUrl;
    let settingOverrides;

    beforeAll(async function () {
        await testUtils.startGhost();
        siteUrl = configUtils.config.get('url').replace(/\/$/, '');
        request = supertest.agent(configUtils.config.get('url'));
    });

    beforeEach(function () {
        settingOverrides = {};
        const originalGet = settingsCache.get;
        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (Object.hasOwn(settingOverrides, key)) {
                return settingOverrides[key];
            }

            if (key === 'labs') {
                return {llmsTxt: true};
            }

            return originalGet(key, options);
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('serves llms.txt with published public entries and absolute urls', async function () {
        const res = await request.get('/llms.txt')
            .expect('Content-Type', /text\/plain/)
            .expect(200);

        // entries are linked via absolute urls resolved by the public API serializer
        assert.ok(res.text.includes(`[About this site](${siteUrl}/about.md)`), 'expected absolute .md link for the about page');
        assert.ok(res.text.includes(`[Start here for a quick overview of everything you need to know](${siteUrl}/welcome.md)`), 'expected absolute .md link for the welcome post');
        assert.ok(!res.text.includes(`[Selling premium memberships with recurring revenue](${siteUrl}/sell.md)`), 'expected paid post to be hidden while machine payments are disabled');

        // descriptions come from plaintext, which is requested via `formats`
        // on top of the narrowed `fields`
        assert.match(res.text, /\[Start here for a quick overview of everything you need to know\]\([^)]+\) - We've crammed the most important information/);

        // the .md discoverability line and the llms-full link in Optional
        assert.match(res.text, /Append `\.md` to any post or page URL/);
        assert.ok(res.text.includes(`[Full content of pages and posts](${siteUrl}/llms-full.txt)`), 'expected llms-full link in Optional');
    });

    it('serves llms-full.txt with entry bodies and absolute urls', async function () {
        const res = await request.get('/llms-full.txt')
            .expect('Content-Type', /text\/plain/)
            .expect(200);

        assert.match(res.text, /### About this site/);
        assert.match(res.text, /### Start here for a quick overview of everything you need to know/);
        assert.ok(res.text.includes(`URL: ${siteUrl}/about/`), 'expected absolute url for the about page entry');

        // entry bodies are rendered from html, which is requested via
        // `formats` on top of the narrowed `fields`
        assert.match(res.text, /An about page is a great example of one you might want to set up early on/);

        // the .md discoverability line appears in both files
        assert.match(res.text, /Append `\.md` to any post or page URL/);

        // truncation footer (if present) points at the sitemap, not /llms.txt
        assert.doesNotMatch(res.text, /Use `\/llms\.txt`/);
    });

    it('outputs a markdown alternate link on public post pages', async function () {
        const res = await request.get('/welcome/')
            .expect('Content-Type', /text\/html/)
            .expect(200);

        assert.match(res.text, new RegExp(`<link rel="alternate" type="text/markdown" href="${siteUrl}/welcome\\.md">`));
    });

    it('serves a machine payment challenge for paid post markdown URLs', async function () {
        settingOverrides = {
            labs: {machinePayments: true},
            machine_payments_enabled: true,
            machine_payments_currency: 'USD',
            machine_payments_amount: 100
        };

        const originalAddressProvider = machinePaymentsService.x402Adapter.addressProvider;
        const originalFacilitatorClient = machinePaymentsService.x402Adapter.facilitatorClient;
        const addressProvider = {
            getAddress: sinon.stub().resolves('0x0000000000000000000000000000000000000001')
        };

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
            const llmsResponse = await request.get('/llms.txt').expect(200);
            assert.ok(llmsResponse.text.includes(`[Selling premium memberships with recurring revenue](${siteUrl}/sell.md)`), 'expected paid post to be discoverable while machine payments are enabled');

            const res = await request.get('/sell.md')
                .expect('Content-Type', /application\/problem\+json/)
                .expect(402);

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
});
