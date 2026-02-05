const assert = require('node:assert/strict');
const should = require('should');

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

        siteData.should.be.an.Object().with.properties('logo');
        assert.equal(siteData.logo, null);
    });

    it('can handle nulls', function () {
        previewString = 'cover=null';

        let siteData = preview.handle(req, {});

        siteData.should.be.an.Object().with.properties('cover_image');
        assert.equal(siteData.cover_image, null);
    });

    it('can handle URIEncoded accent colors', function () {
        previewString = 'c=%23f02d2d';

        let siteData = preview.handle(req, {});

        siteData.should.be.an.Object().with.properties('accent_color');
        assert.equal(siteData.accent_color, '#f02d2d');
    });

    it('can handle multiple values', function () {
        previewString = 'c=%23f02d2d&icon=&logo=&cover=null';

        let siteData = preview.handle(req, {});
        siteData.should.be.an.Object().with.properties('accent_color', 'icon', 'logo', 'cover_image');

        assert.equal(siteData.accent_color, '#f02d2d');
        assert.equal(siteData.icon, null);
        assert.equal(siteData.logo, null);
        assert.equal(siteData.cover_image, null);
    });
});
