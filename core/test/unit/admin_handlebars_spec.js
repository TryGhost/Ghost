var should         = require('should'),
    sinon          = require('sinon'),
    configUtils    = require('../utils/configUtils'),
    settingsCache  = require('../../server/settings/cache'),

    adminHbs       = require('../../server/admin/handlebars'),
    helpers        = adminHbs._helpers,

    sandbox        = sinon.sandbox.create();

describe('ADMIN {{asset}} helper', function () {
    var rendered, localSettingsCache = {};

    before(function () {
        configUtils.set({assetHash: 'abc'});

        sandbox.stub(settingsCache, 'get', function (key) {
            return localSettingsCache[key];
        });
    });

    after(function () {
        configUtils.restore();
        sandbox.restore();
    });

    describe('no subdirectory', function () {
        it('handles favicon correctly', function () {
            rendered = helpers.adminAsset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');
        });

        it('handles custom favicon correctly', function () {
            localSettingsCache.icon = '/content/images/favicon.png';

            // png
            rendered = helpers.adminAsset('favicon.png');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');

            localSettingsCache.icon = '/content/images/favicon.ico';

            // ico
            rendered = helpers.adminAsset('favicon.ico');
            should.exist(rendered);
        });

        it('handles shared assets correctly', function () {
            localSettingsCache.icon = '';

            rendered = helpers.adminAsset('shared/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/shared/asset.js?v=abc');
        });

        it('handles admin assets correctly', function () {
            rendered = helpers.adminAsset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/ghost/assets/js/asset.js?v=abc');
        });
    });

    describe('with /blog subdirectory', function () {
        before(function () {
            configUtils.set({url: 'http://testurl.com/blog'});
        });

        it('handles favicon correctly', function () {
            rendered = helpers.adminAsset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');
        });

        it('handles custom favicon correctly', function () {
            localSettingsCache.icon = '/content/images/favicon.png';

            // png
            rendered = helpers.adminAsset('favicon.png');
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');

            localSettingsCache.icon = '/content/images/favicon.ico';

            // ico
            rendered = helpers.adminAsset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');
        });

        it('handles shared assets correctly', function () {
            rendered = helpers.adminAsset('shared/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/shared/asset.js?v=abc');
        });

        it('handles admin assets correctly', function () {
            rendered = helpers.adminAsset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/ghost/assets/js/asset.js?v=abc');
        });

        configUtils.restore();
    });
});
