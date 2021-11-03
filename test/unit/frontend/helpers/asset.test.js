// NOTE: the sole purpose of this suite is to test is it calls through to getAssetUrlHelper
//       more complicated use cases are tested directly in asset_url.spec

const should = require('should');

const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');
const asset = require('../../../../core/frontend/helpers/asset');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('{{asset}} helper', function () {
    let rendered;
    const localSettingsCache = {};

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
            rendered = asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');
        });

        it('handles ghost.css for default templates correctly', function () {
            rendered = asset('public/ghost.css');
            should.exist(rendered);
            String(rendered).should.equal('/public/ghost.css?v=abc');
        });

        it('handles custom favicon correctly', function () {
            localSettingsCache.icon = '/content/images/favicon.png';

            // with png
            rendered = asset('favicon.png');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.png');

            localSettingsCache.icon = '/content/images/favicon.ico';

            // with ico
            rendered = asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');
        });

        it('handles public assets correctly', function () {
            localSettingsCache.icon = '';

            rendered = asset('public/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/public/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            rendered = asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/assets/js/asset.js?v=abc');
        });

        it('handles hasMinFile assets correctly', function () {
            rendered = asset('js/asset.js', {hash: {hasMinFile: true}});
            should.exist(rendered);
            String(rendered).should.equal('/assets/js/asset.min.js?v=abc');
        });
    });

    describe('different admin and site urls', function () {
        before(function () {
            configUtils.set({url: 'http://127.0.0.1'});
            configUtils.set({'admin:url': 'http://localhost'});
        });

        after(function () {
            configUtils.restore();
        });

        it('handles favicon correctly', function () {
            rendered = asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('http://127.0.0.1/favicon.ico');
        });

        it('handles ghost.css for default templates correctly', function () {
            rendered = asset('public/ghost.css');
            should.exist(rendered);
            String(rendered).should.equal('http://127.0.0.1/public/ghost.css?v=abc');
        });
    });
});
