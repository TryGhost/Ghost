// Previewing an installed theme that isn't active (Ghost Admin's Design settings):
// a preview renders in that theme, and nothing of it reaches the live site, also
// when previews and live requests interleave. Source is the active theme in tests;
// Casper is previewed.
const assert = require('node:assert/strict');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const previewToken = require('../../core/shared/theme-preview-token');
const { mockManager } = require('../utils/e2e-framework');

const PREVIEW_HEADER = 'x-ghost-preview';

describe('Theme previews', function () {
  let request;
  let token;
  let assetToken;

  const previewPage = (path, previewTokenValue = token) =>
    request.post(path).set(PREVIEW_HEADER, `theme_token=${previewTokenValue}`);
  const isLive = (html) => html.includes('built/source.js') && !html.includes('/assets/_preview/');
  const isPreview = (html) =>
    html.includes('built/casper.js') && html.includes(`/assets/_preview/${assetToken}/`);
  // Never cacheable, by a CDN or a browser (Ghost's private or no-cache value, either way no-store)
  const assertPrivate = (res) => assert.match(res.headers['cache-control'], /no-store/);

  beforeAll(async function () {
    await testUtils.startGhost({ copyThemes: true });
    request = supertest.agent(configUtils.config.get('url'));
  });

  beforeEach(function () {
    mockManager.mockLabsEnabled('themePreview');
    token = previewToken.create('casper').token;
    assetToken = previewToken.assetTokenFor(token);
  });

  afterEach(function () {
    mockManager.restore();
  });

  it('renders a page in the previewed theme, uncacheable', async function () {
    const res = await previewPage('/').expect(200);

    assert.ok(isPreview(res.text), 'renders in Casper, with its assets under the preview');
    assertPrivate(res);
  });

  it('leaves the live site as it is', async function () {
    await previewPage('/').expect(200);
    const res = await request.get('/').expect(200);

    assert.ok(isLive(res.text), 'renders in Source, with its own assets');
    assert.doesNotMatch(res.headers['cache-control'] || '', /no-store/);
  });

  it('never mixes previews and live requests that run at the same time', async function () {
    const requests = Array.from({ length: 12 }, (_, index) =>
      index % 2 ? previewPage('/') : request.get('/'),
    );
    const responses = await Promise.all(requests);

    responses.forEach((res, index) => {
      assert.equal(res.status, 200);
      if (index % 2) {
        assert.ok(isPreview(res.text), `request ${index} is a preview`);
      } else {
        assert.ok(isLive(res.text), `request ${index} is live`);
      }
    });
  });

  it("serves the previewed theme's assets under the token, uncacheable", async function () {
    const res = await request.get(`/assets/_preview/${assetToken}/built/screen.css`).expect(200);

    assert.match(res.headers['content-type'], /css/);
    assertPrivate(res);
  });

  it("renders the previewed theme's error page for a missing page", async function () {
    const res = await previewPage('/no-such-page/').expect(404);

    assert.ok(res.text.includes(`/assets/_preview/${assetToken}/`), 'renders in Casper');
    assertPrivate(res);
  });

  it('refuses an invalid token rather than show the live theme in its place', async function () {
    const page = await previewPage('/', 'not.valid').expect(403);
    assertPrivate(page);

    const asset = await request.get('/assets/_preview/not.valid/built/screen.css').expect(404);
    assertPrivate(asset);
  });

  it("doesn't preview from a GET, which could be cached as the page", async function () {
    const res = await request.get('/').set(PREVIEW_HEADER, `theme_token=${token}`).expect(200);

    assert.ok(isLive(res.text));
  });

  it('does nothing while theme previews are off', async function () {
    mockManager.mockLabsDisabled('themePreview');

    const res = await previewPage('/').expect(200);
    assert.ok(isLive(res.text));
  });

  it("won't render pages with an asset token, or serve assets with a page token", async function () {
    await previewPage('/', assetToken).expect(403);
    await request.get(`/assets/_preview/${token}/built/screen.css`).expect(404);
  });
});
