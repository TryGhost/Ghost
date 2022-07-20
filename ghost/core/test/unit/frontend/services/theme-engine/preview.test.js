const should = require('should');
const sinon = require('sinon');

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
        should(siteData.logo).be.null();
    });

    it('can handle nulls', function () {
        previewString = 'cover=null';

        let siteData = preview.handle(req, {});

        siteData.should.be.an.Object().with.properties('cover_image');
        should(siteData.cover_image).be.null();
    });

    it('can handle URIEncoded accent colors', function () {
        previewString = 'c=%23f02d2d';

        let siteData = preview.handle(req, {});

        siteData.should.be.an.Object().with.properties('accent_color');
        should(siteData.accent_color).eql('#f02d2d');
    });

    it('can handle multiple values', function () {
        previewString = 'c=%23f02d2d&icon=&logo=&cover=null';

        let siteData = preview.handle(req, {});
        siteData.should.be.an.Object().with.properties('accent_color', 'icon', 'logo', 'cover_image');

        should(siteData.accent_color).eql('#f02d2d');
        should(siteData.icon).be.null();
        should(siteData.logo).be.null();
        should(siteData.cover_image).be.null();
    });
});
