var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    configUtils = require('../../utils/configUtils'),
    helpers = require('../../../server/helpers'),
    settingsCache = require('../../../server/settings/cache'),

    sandbox = sinon.sandbox.create();

describe('{{asset}} helper', function () {
    var rendered, localSettingsCache = {};

    before(function () {
        configUtils.set({assetHash: 'abc'});
        configUtils.set({useMinFiles: true});

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

    describe('with /blog subdirectory', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:82832/blog'});
        });

        it('handles favicon correctly', function () {
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');
        });

        it('handles ghost.css for default templates correctly', function () {
            rendered = helpers.asset('public/ghost.css');
            should.exist(rendered);
            String(rendered).should.equal('/blog/public/ghost.css?v=abc');
        });

        it('handles custom favicon correctly', function () {
            localSettingsCache.icon = '/content/images/favicon.png';

            // with  png
            rendered = helpers.asset('favicon.png');
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.png');

            localSettingsCache.icon = '/content/images/favicon.ico';

            // with ico
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');
        });

        it('handles public assets correctly', function () {
            rendered = helpers.asset('public/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/public/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/assets/js/asset.js?v=abc');
        });

        it('handles hasMinFile assets correctly', function () {
            rendered = helpers.asset('js/asset.js', {hash: {hasMinFile: true}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/assets/js/asset.min.js?v=abc');
        });

        configUtils.restore();
    });
});
