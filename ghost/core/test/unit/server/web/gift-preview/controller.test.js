const assert = require('node:assert/strict');
const sinon = require('sinon');

const labs = require('../../../../../core/shared/labs');
const urlUtils = require('../../../../../core/shared/url-utils');
const settingsCache = require('../../../../../core/shared/settings-cache');
const giftServiceWrapper = require('../../../../../core/server/services/gifts');

const controller = require('../../../../../core/server/web/gift-preview/controller');

describe('Gift Preview Controller', function () {
    let req;
    let res;
    let originalGiftService;

    beforeEach(function () {
        req = {
            params: {
                token: 'test-token-123'
            }
        };
        res = {
            redirect: sinon.stub(),
            send: sinon.stub(),
            sendStatus: sinon.stub(),
            set: sinon.stub()
        };
        originalGiftService = giftServiceWrapper.service;

        sinon.stub(urlUtils, 'getSiteUrl').returns('https://example.com/');
        sinon.stub(settingsCache, 'get');
        settingsCache.get.withArgs('title').returns('Test Blog');
        settingsCache.get.withArgs('accent_color').returns('#FF5733');
    });

    afterEach(function () {
        giftServiceWrapper.service = originalGiftService;

        sinon.restore();
    });

    describe('giftPreview', function () {
        it('redirects to homepage when lab flag is disabled', async function () {
            sinon.stub(labs, 'isSet').withArgs('giftSubscriptions').returns(false);

            await controller.giftPreview(req, res);

            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 302, 'https://example.com/');
        });

        it('redirects to homepage when gift token is invalid', async function () {
            sinon.stub(labs, 'isSet').withArgs('giftSubscriptions').returns(true);
            giftServiceWrapper.service = {
                getByToken: sinon.stub().rejects(new Error('Not found'))
            };

            await controller.giftPreview(req, res);

            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 302, 'https://example.com/');
        });

        it('redirects to homepage when gift token is not found (null)', async function () {
            sinon.stub(labs, 'isSet').withArgs('giftSubscriptions').returns(true);
            giftServiceWrapper.service = {
                getByToken: sinon.stub().resolves(null)
            };

            await controller.giftPreview(req, res);

            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 302, 'https://example.com/');
        });

        it('returns HTML with OG tags for a valid gift', async function () {
            sinon.stub(labs, 'isSet').withArgs('giftSubscriptions').returns(true);
            giftServiceWrapper.service = {
                getByToken: sinon.stub().resolves({
                    tierId: 'tier_1',
                    cadence: 'year',
                    duration: 1
                })
            };

            await controller.giftPreview(req, res);

            sinon.assert.calledWith(res.set, 'Cache-Control', 'public, max-age=3600');
            sinon.assert.calledWith(res.set, 'Content-Type', 'text/html; charset=utf-8');
            sinon.assert.calledOnce(res.send);

            const html = res.send.firstCall.args[0];
            const expectedTitle = '<meta property="og:title" content="You\'ve been gifted 1 year of Test Blog">';
            const expectedDescription = '<meta property="og:description" content="' +
                'Open this link to redeem your gift.">';
            const expectedImage = '<meta property="og:image" content="https://example.com/gift/test-token-123/image">';

            assert.ok(html.includes(expectedTitle));
            assert.ok(html.includes(expectedDescription));
            assert.ok(html.includes(expectedImage));
            assert.ok(html.includes('<meta property="og:url" content="https://example.com/gift/test-token-123">'));
            assert.ok(html.includes('content="0;url=https://example.com/#/portal/gift/redeem/test-token-123"'));
        });

        it('escapes HTML in site title', async function () {
            sinon.stub(labs, 'isSet').withArgs('giftSubscriptions').returns(true);
            settingsCache.get.withArgs('title').returns('Blog <script>alert("xss")</script>');
            giftServiceWrapper.service = {
                getByToken: sinon.stub().resolves({
                    tierId: 'tier_1',
                    cadence: 'month',
                    duration: 3
                })
            };

            await controller.giftPreview(req, res);

            const html = res.send.firstCall.args[0];

            assert.ok(!html.includes('<script>alert("xss")</script>'));
            assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
        });

        it('uses monthly cadence label', async function () {
            sinon.stub(labs, 'isSet').withArgs('giftSubscriptions').returns(true);
            giftServiceWrapper.service = {
                getByToken: sinon.stub().resolves({
                    tierId: 'tier_1',
                    cadence: 'month',
                    duration: 3
                })
            };

            await controller.giftPreview(req, res);

            const html = res.send.firstCall.args[0];

            assert.ok(html.includes('You\'ve been gifted 3 months of Test Blog'));
            assert.ok(html.includes('Open this link to redeem your gift.'));
        });

        it('defaults site title to Ghost', async function () {
            sinon.stub(labs, 'isSet').withArgs('giftSubscriptions').returns(true);
            settingsCache.get.withArgs('title').returns(null);
            giftServiceWrapper.service = {
                getByToken: sinon.stub().resolves({
                    tierId: 'tier_1',
                    cadence: 'year',
                    duration: 1
                })
            };

            await controller.giftPreview(req, res);

            const html = res.send.firstCall.args[0];

            assert.ok(html.includes('You\'ve been gifted 1 year of Ghost'));
        });
    });

    describe('giftPreviewImage', function () {
        it('returns 404 when lab flag is disabled', async function () {
            sinon.stub(labs, 'isSet').withArgs('giftSubscriptions').returns(false);

            await controller.giftPreviewImage(req, res);

            sinon.assert.calledOnce(res.sendStatus);
            sinon.assert.calledWith(res.sendStatus, 404);
        });
    });
});
