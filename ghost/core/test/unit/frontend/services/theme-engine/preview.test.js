const assert = require('node:assert/strict');
// No need for 'should' anymore

const preview = require('../../../../../core/frontend/services/theme-engine/preview');

describe('Theme Preview', function () {
    let req, previewString = '';

    before(function () {
        req = {
            header: () => {
                return previewString;
            }
        };
    });

    it('can handle empty strings', function () {
        previewString = 'logo=';

        let siteData = preview.handle(req, {});

        assert.equal(siteData.logo, null);
    });

    it('can handle nulls', function () {
        previewString = 'cover=null';

        let siteData = preview.handle(req, {});

        assert.equal(siteData.cover_image, null);
    });

    it('can handle URIEncoded accent colors', function () {
        previewString = 'c=%23f02d2d';

        let siteData = preview.handle(req, {});

        assert.equal(siteData.accent_color, '#f02d2d');
    });

    it('can handle multiple values', function () {
        previewString = 'c=%23f02d2d&icon=&logo=&cover=null';

        let siteData = preview.handle(req, {});

        assert.equal(siteData.accent_color, '#f02d2d');
        assert.equal(siteData.icon, null);
        assert.equal(siteData.logo, null);
        assert.equal(siteData.cover_image, null);
    });
});
