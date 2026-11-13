const assert = require('node:assert/strict');
// No need for 'should' anymore

const preview = require('../../../../../core/frontend/services/theme-engine/preview');

describe('Theme Preview', function () {
  let req,
    previewString = '';

  beforeAll(function () {
    req = {
      header: () => {
        return previewString;
      },
    };
  });

  it('can handle empty strings', function () {
    previewString = 'logo=';

    const siteData = preview.handle(req, {});

    assert.equal(siteData.logo, null);
  });

  it('can handle nulls', function () {
    previewString = 'cover=null';

    const siteData = preview.handle(req, {});

    assert.equal(siteData.cover_image, null);
  });

  it('can handle URIEncoded accent colors', function () {
    previewString = 'c=%23f02d2d';

    const siteData = preview.handle(req, {});

    assert.equal(siteData.accent_color, '#f02d2d');
  });

  it('can handle multiple values', function () {
    previewString = 'c=%23f02d2d&icon=&logo=&cover=null';

    const siteData = preview.handle(req, {});

    assert.equal(siteData.accent_color, '#f02d2d');
    assert.equal(siteData.icon, null);
    assert.equal(siteData.logo, null);
    assert.equal(siteData.cover_image, null);
  });

  describe('theme previews', function () {
    const header = (value) => (name) => (name === 'x-ghost-preview' ? value : undefined);

    it('takes the token of a page from the preview header of a POST', function () {
      assert.equal(
        preview.getPageToken({ method: 'POST', header: header('c=%23fff&theme_token=abc.def') }),
        'abc.def',
      );
    });

    it('never takes a token from a GET, which could be cached as the page', function () {
      assert.equal(
        preview.getPageToken({ method: 'GET', header: header('theme_token=abc.def') }),
        null,
      );
    });

    it('reads a preview asset path as the token and the asset in the theme', function () {
      assert.deepEqual(
        preview.getAssetRequest({ path: '/assets/_preview/abc.def/fonts/x.woff2' }),
        { token: 'abc.def', assetPath: '/assets/fonts/x.woff2' },
      );
      assert.equal(preview.getAssetRequest({ path: '/assets/built/screen.css' }), null);
      assert.equal(preview.getAssetRequest({ path: '/assets/_preview/not-a-token/x.css' }), null);
    });
  });
});
