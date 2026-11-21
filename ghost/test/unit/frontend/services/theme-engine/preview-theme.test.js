const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const labs = require('../../../../../core/shared/labs');
const settingsCache = require('../../../../../core/shared/settings-cache');
const previewToken = require('../../../../../core/shared/theme-preview-token');
const proxy = require('../../../../../core/frontend/services/proxy');
const active = require('../../../../../core/frontend/services/theme-engine/active');
const previewContext = require('../../../../../core/frontend/services/theme-engine/preview-context');
const previewTheme = require('../../../../../core/frontend/services/theme-engine/preview-theme');

function loadedTheme(name) {
  return { name, path: `/themes/${name}`, 'package.json': { name, config: {} } };
}

const checkedTheme = { partials: [], templates: { all: ['index'], custom: [] } };

describe('Theme previews', function () {
  let themes;

  beforeEach(function () {
    previewTheme._cache.clear();
    themes = { casper: loadedTheme('casper'), headline: loadedTheme('headline') };
    sinon.stub(labs, 'isSet').withArgs('themePreview').returns(true);
    sinon.stub(proxy.themes, 'get').callsFake((name) => themes[name]);
    sinon.stub(proxy.themes, 'check').resolves(checkedTheme);
    sinon.stub(proxy.themes, 'canActivate').returns(true);
    sinon.stub(active, 'get').returns({ name: 'source' });
    // Real tokens, signed with a test secret
    sinon
      .stub(settingsCache, 'get')
      .callsFake((key) => (key === 'admin_session_secret' ? 'test-secret' : undefined));
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('load', function () {
    it('builds a theme once per upload of it', async function () {
      const first = await previewTheme.load('casper');
      const again = await previewTheme.load('casper');

      assert.equal(first, again);
      assert.equal(first.name, 'casper');
      assert.equal(first.isPreview, true);
      sinon.assert.calledOnce(proxy.themes.check);

      // Uploaded again: the theme list holds a new entry
      themes.casper = loadedTheme('casper');
      const rebuilt = await previewTheme.load('casper');
      assert.notEqual(rebuilt, first);
    });

    it('remembers a theme that failed its checks rather than checking it on every request', async function () {
      proxy.themes.canActivate.returns(false);

      await assert.rejects(previewTheme.load('casper'), errors.ValidationError);
      await assert.rejects(previewTheme.load('casper'), errors.ValidationError);
      sinon.assert.calledOnce(proxy.themes.check);
    });

    it('keeps only a few themes', async function () {
      for (const name of ['a', 'b', 'c', 'd']) {
        themes[name] = loadedTheme(name);
        await previewTheme.load(name);
      }

      assert.deepEqual([...previewTheme._cache.keys()], ['b', 'c', 'd']);
    });

    it('finds nothing for a theme that is not installed', async function () {
      assert.equal(await previewTheme.load('nope'), null);
    });
  });

  describe('middleware', function () {
    function run(req) {
      const res = { set: sinon.stub() };
      return new Promise((resolve) => {
        previewTheme.middleware(
          Object.assign(req, {
            method: req.method || 'GET',
            header: req.header || (() => undefined),
          }),
          res,
          (err) => {
            resolve({ err, res, theme: previewContext.get() });
          },
        );
      });
    }

    function pageRequest(token) {
      return {
        method: 'POST',
        path: '/',
        url: '/',
        header: (name) =>
          name === 'x-ghost-preview' ? `c=%23fff&theme_token=${token}` : undefined,
      };
    }

    it('does nothing while theme previews are off', async function () {
      labs.isSet.withArgs('themePreview').returns(false);

      const { err, res, theme } = await run(pageRequest(previewToken.create('casper').token));

      assert.equal(err, undefined);
      assert.equal(theme, undefined);
      sinon.assert.notCalled(res.set);
    });

    it('leaves requests without a preview token alone', async function () {
      const { err, theme } = await run({
        path: '/assets/built/screen.css',
        url: '/assets/built/screen.css',
      });

      assert.equal(err, undefined);
      assert.equal(theme, undefined);
    });

    it('refuses a page with an invalid or expired token instead of showing the live theme', async function () {
      const expired = previewToken.create('casper', Date.now() - previewToken.TTL_MS - 1).token;

      for (const token of ['bad', expired]) {
        const { err } = await run(pageRequest(token));
        assert.ok(err instanceof errors.NoPermissionError);
      }
    });

    it('answers an asset under an invalid token with a 404', async function () {
      const { err } = await run({
        path: '/assets/_preview/abc.def/built/screen.css',
        url: '/assets/_preview/abc.def/built/screen.css',
      });

      assert.ok(err instanceof errors.NotFoundError);
    });

    it('renders a page in the previewed theme, uncacheable', async function () {
      const { err, res, theme } = await run(pageRequest(previewToken.create('casper').token));

      assert.equal(err, undefined);
      assert.equal(theme.name, 'casper');
      assert.equal(theme.isPreview, true);
      sinon.assert.calledWith(res.set, 'Cache-Control', sinon.match(/private, no-store/));
    });

    it("serves a previewed theme's asset from its own path in the theme", async function () {
      const assetToken = previewToken.assetTokenFor(previewToken.create('casper').token);
      const req = {
        path: `/assets/_preview/${assetToken}/built/screen.css`,
        url: `/assets/_preview/${assetToken}/built/screen.css?v=1`,
      };

      const { err, theme } = await run(req);

      assert.equal(err, undefined);
      assert.equal(req.url, '/assets/built/screen.css?v=1');
      assert.equal(theme.name, 'casper');
    });

    it('needs no preview for the active theme', async function () {
      const { err, theme } = await run(pageRequest(previewToken.create('source').token));

      assert.equal(err, undefined);
      assert.equal(theme, undefined);
      sinon.assert.notCalled(proxy.themes.check);
    });

    it('says so when the theme is no longer installed', async function () {
      const { err } = await run(pageRequest(previewToken.create('deleted').token));

      assert.ok(err instanceof errors.NotFoundError);
    });
  });
});
