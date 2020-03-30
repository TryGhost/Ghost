// NOTE: the sole purpose of this suite is to test is it calls through to getAssetUrlHelper
//       more complicated use cases are tested directly in asset_url.spec

var should = require('should'),
    sinon = require('sinon'),
    configUtils = require('../../utils/configUtils'),
    helpers = require('../../../core/frontend/helpers'),
    settingsCache = require('../../../core/server/services/settings/cache');

describe('{{asset}} helper', function () {
    var rendered, localSettingsCache = {};

    before(function () {
        configUtils.set({assetHash: 'abc'});
        configUtils.set({useMinFiles: true});

        sinon.stub(settingsCache, 'get').callsFake(function (key) {
            return localSettingsCache[key];
        });
    });

    after(function () {
        configUtils.restore();
        sinon.restore();
    });

    describe('no subdirectory', function () {
        it('handles favicon correctly', function () {
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');
        });

        it('handles ghost.css for default templates correctly', function () {
            rendered = helpers.asset('public/ghost.css');
            should.exist(rendered);
            String(rendered).should.equal('/public/ghost.css?v=abc');
        });

        it('handles custom favicon correctly', function () {
            localSettingsCache.icon = '/content/images/favicon.png';

            // with png
            rendered = helpers.asset('favicon.png');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.png');

            localSettingsCache.icon = '/content/images/favicon.ico';

            // with ico
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');
        });

        it('handles public assets correctly', function () {
            localSettingsCache.icon = '';

            rendered = helpers.asset('public/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/public/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/assets/js/asset.js?v=abc');
        });

        it('handles hasMinFile assets correctly', function () {
            rendered = helpers.asset('js/asset.js', {hash: {hasMinFile: true}});
            should.exist(rendered);
            String(rendered).should.equal('/assets/js/asset.min.js?v=abc');
        });
    });
});
