const assert = require('node:assert/strict');
const Module = require('node:module');
const sinon = require('sinon');

const urlUtils = require('../../../../../core/shared/url-utils').default;
const settingsCache = require('../../../../../core/shared/settings-cache');

// Initialise i18n before requiring the controller so its destructured `t`
// import resolves to the live i18next instance. The init helper falls back
// to 'en' when the locale setting isn't set.
require('../../../../../core/server/services/i18n').init();

const controller = require('../../../../../core/server/web/gift-preview/controller');

// The gifts module's exports are getter-only under tsx, so the service can't be
// stubbed by assignment. Intercept the controller's lazy require of the module
// instead, matching on the resolved file path so renames or moved requires can't
// silently defeat the stub.
const giftsModulePath = require.resolve('../../../../../core/server/services/gifts');

describe('Gift Preview Controller', function () {
  let giftService;
  let originalModuleLoad;
  let req;
  let res;

  beforeEach(function () {
    giftService = {
      getPreview: sinon.stub(),
    };
    originalModuleLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (parent && Module._resolveFilename(request, parent, isMain) === giftsModulePath) {
        return { service: giftService };
      }

      return originalModuleLoad.call(this, request, parent, isMain);
    };
    req = {
      params: {
        token: 'test-token-123',
      },
    };
    res = {
      redirect: sinon.stub(),
      send: sinon.stub(),
      sendStatus: sinon.stub(),
      set: sinon.stub(),
    };

    sinon.stub(urlUtils, 'getSiteUrl').returns('https://example.com/');
    sinon.stub(settingsCache, 'get');
    settingsCache.get.withArgs('title').returns('Test Blog');
    settingsCache.get.withArgs('accent_color').returns('#FF5733');
  });

  afterEach(function () {
    Module._load = originalModuleLoad;
    sinon.restore();
  });

  describe('giftPreview', function () {
    it('redirects to homepage when gift token is invalid', async function () {
      giftService.getPreview.rejects(new Error('Not found'));

      await controller.giftPreview(req, res);

      sinon.assert.calledOnce(res.redirect);
      sinon.assert.calledWith(res.redirect, 302, 'https://example.com/');
    });

    it('redirects to homepage when gift token is not found (null)', async function () {
      giftService.getPreview.resolves(null);

      await controller.giftPreview(req, res);

      sinon.assert.calledOnce(res.redirect);
      sinon.assert.calledWith(res.redirect, 302, 'https://example.com/');
    });

    it('returns HTML with OG tags for a valid gift', async function () {
      giftService.getPreview.resolves({
        tier: { id: 'tier_1', name: 'Premium' },
        cadence: 'year',
        duration: 1,
      });

      await controller.giftPreview(req, res);

      sinon.assert.calledWith(res.set, 'Cache-Control', 'public, max-age=3600');
      sinon.assert.calledWith(res.set, 'Content-Type', 'text/html; charset=utf-8');
      sinon.assert.calledOnce(res.send);

      const html = res.send.firstCall.args[0];
      const expectedTitle =
        '<meta property="og:title" content="You\'ve been gifted a 1-year Premium membership to Test Blog">';
      const expectedDescription =
        '<meta property="og:description" content="' + 'Open this link to redeem your gift.">';
      const expectedImage =
        '<meta property="og:image" content="https://example.com/gift/test-token-123/image">';

      assert.ok(html.includes(expectedTitle));
      assert.ok(html.includes(expectedDescription));
      assert.ok(html.includes(expectedImage));
      assert.ok(
        html.includes('<meta property="og:url" content="https://example.com/gift/test-token-123">'),
      );
      assert.ok(
        html.includes('content="0;url=https://example.com/#/portal/gift/redeem/test-token-123"'),
      );
    });

    it('escapes HTML in site title', async function () {
      settingsCache.get.withArgs('title').returns('Blog <script>alert("xss")</script>');
      giftService.getPreview.resolves({
        tier: { id: 'tier_1', name: 'Premium' },
        cadence: 'month',
        duration: 3,
      });

      await controller.giftPreview(req, res);

      const html = res.send.firstCall.args[0];

      assert.ok(!html.includes('<script>alert("xss")</script>'));
      assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
    });

    it('uses monthly cadence label', async function () {
      giftService.getPreview.resolves({
        tier: { id: 'tier_1', name: 'Premium' },
        cadence: 'month',
        duration: 3,
      });

      await controller.giftPreview(req, res);

      const html = res.send.firstCall.args[0];

      assert.ok(html.includes("You've been gifted a 3-month Premium membership to Test Blog"));
      assert.ok(html.includes('Open this link to redeem your gift.'));
    });

    it('defaults site title to Ghost', async function () {
      settingsCache.get.withArgs('title').returns(null);
      giftService.getPreview.resolves({
        tier: { id: 'tier_1', name: 'Premium' },
        cadence: 'year',
        duration: 1,
      });

      await controller.giftPreview(req, res);

      const html = res.send.firstCall.args[0];

      assert.ok(html.includes("You've been gifted a 1-year Premium membership to Ghost"));
    });
  });

  describe('giftPreviewImage', function () {
    it('returns a PNG image for a valid gift', async function () {
      giftService.getPreview.resolves({
        tier: { id: 'tier_1', name: 'Gold' },
        cadence: 'year',
        duration: 1,
      });

      await controller.giftPreviewImage(req, res);

      sinon.assert.calledWith(res.set, 'Content-Type', 'image/png');
      sinon.assert.calledWith(res.set, 'Cache-Control', 'public, max-age=86400');
      sinon.assert.calledOnce(res.send);

      const image = res.send.firstCall.args[0];

      assert.ok(Buffer.isBuffer(image));
      assert.equal(image[0], 0x89);
      assert.equal(image[1], 0x50);
      assert.equal(image[2], 0x4e);
      assert.equal(image[3], 0x47);
    });
  });
});
