const assert = require('node:assert/strict');
const supertest = require('supertest');
const config = require('../../../core/shared/config');
const previewToken = require('../../../core/shared/theme-preview-token');
const localUtils = require('./utils');
const { mockManager } = require('../../utils/e2e-framework');

// Previewing an installed theme without activating it (Admin's Design settings):
// the preview token, an inactive theme's settings, and activating with settings
describe('Theme previews API', function () {
  let ownerRequest;

  const api = (path) => localUtils.API.getApiQuery(path);
  const activeThemeName = async () => {
    const res = await ownerRequest
      .get(api('themes/active/'))
      .set('Origin', config.get('url'))
      .expect(200);
    return res.body.themes[0].name;
  };

  beforeAll(async function () {
    await localUtils.startGhost({ copyThemes: true });
    ownerRequest = supertest.agent(config.get('url'));
    await localUtils.doAuth(ownerRequest);
  });

  beforeEach(async function () {
    mockManager.mockLabsEnabled('themePreview');
    await ownerRequest
      .put(api('themes/source/activate'))
      .set('Origin', config.get('url'))
      .expect(200);
  });

  afterEach(function () {
    mockManager.restore();
  });

  it('gives a token to preview an installed theme', async function () {
    const res = await ownerRequest
      .get(api('themes/casper/preview-token/'))
      .set('Origin', config.get('url'))
      .expect(200);

    const [preview] = res.body.theme_previews;
    assert.equal(preview.theme, 'casper');
    assert.equal(previewToken.verify(preview.token), 'casper');
    assert.ok(Date.parse(preview.expires_at) > Date.now());
  });

  it('gives no token for a theme that is not installed, or while previews are off', async function () {
    await ownerRequest
      .get(api('themes/nope/preview-token/'))
      .set('Origin', config.get('url'))
      .expect(404);
    await ownerRequest
      .get(api('themes/constructor/preview-token/'))
      .set('Origin', config.get('url'))
      .expect(404);

    mockManager.mockLabsDisabled('themePreview');
    await ownerRequest
      .get(api('themes/casper/preview-token/'))
      .set('Origin', config.get('url'))
      .expect(404);
  });

  it("lists an inactive theme's settings without changing them", async function () {
    const res = await ownerRequest
      .get(api('custom_theme_settings/?theme=casper'))
      .set('Origin', config.get('url'))
      .expect(200);

    const keys = res.body.custom_theme_settings.map(({ key }) => key);
    assert.ok(keys.includes('feed_layout'));
    assert.ok(keys.includes('color_scheme'));
    assert.equal(await activeThemeName(), 'source');
  });

  it('activates a theme with the settings chosen in its preview', async function () {
    await ownerRequest
      .put(api('themes/casper/activate/'))
      .set('Origin', config.get('url'))
      .send({
        custom_theme_settings: [
          { key: 'feed_layout', value: 'Grid' },
          { key: 'color_scheme', value: 'Dark' },
        ],
      })
      .expect(200);

    assert.equal(await activeThemeName(), 'casper');

    const res = await ownerRequest
      .get(api('custom_theme_settings/'))
      .set('Origin', config.get('url'))
      .expect(200);
    const values = Object.fromEntries(
      res.body.custom_theme_settings.map(({ key, value }) => [key, value]),
    );
    assert.equal(values.feed_layout, 'Grid');
    assert.equal(values.color_scheme, 'Dark');
  });

  it('refuses a bad setting before the theme goes live', async function () {
    await ownerRequest
      .put(api('themes/casper/activate/'))
      .set('Origin', config.get('url'))
      .send({ custom_theme_settings: [{ key: 'feed_layout', value: 'Mosaic' }] })
      .expect(422);

    assert.equal(await activeThemeName(), 'source');
  });

  it('refuses keys every object has (such as constructor) before the theme goes live', async function () {
    await ownerRequest
      .put(api('themes/casper/activate/'))
      .set('Origin', config.get('url'))
      .send({ custom_theme_settings: [{ key: 'constructor', value: 'x' }] })
      .expect(422);

    assert.equal(await activeThemeName(), 'source');
  });
});
