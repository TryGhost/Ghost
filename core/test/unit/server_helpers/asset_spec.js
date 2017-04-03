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
            // with ghost set
            rendered = helpers.asset('favicon.ico', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');

            // without ghost set
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');
        });

        it('handles custom favicon correctly', function () {
            localSettingsCache.icon = '/content/images/favicon.png';

            // with ghost set and png
            rendered = helpers.asset('favicon.png', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');

            // without ghost set and png
            rendered = helpers.asset('favicon.png');
            should.exist(rendered);
            String(rendered).should.equal('/content/images/favicon.png');

            localSettingsCache.icon = '/content/images/favicon.ico';

            // with ghost set and ico
            rendered = helpers.asset('favicon.ico', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');

            // without ghost set and ico
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/content/images/favicon.ico');
        });

        it('handles shared assets correctly', function () {
            localSettingsCache.icon = '';

            // with ghost set
            rendered = helpers.asset('shared/asset.js', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/shared/asset.js?v=abc');

            // without ghost set
            rendered = helpers.asset('shared/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/shared/asset.js?v=abc');
        });

        it('handles admin assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('js/asset.js', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/ghost/assets/js/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/assets/js/asset.js?v=abc');
        });
    });

    describe('with /blog subdirectory', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:82832/blog'});
        });

        it('handles favicon correctly', function () {
            // with ghost set
            rendered = helpers.asset('favicon.ico', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');

            // without ghost set
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');
        });

        it('handles custom favicon correctly', function () {
            localSettingsCache.icon = '/content/images/favicon.png';

            // with ghost set and png
            rendered = helpers.asset('favicon.png', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');

            // without ghost set and png
            rendered = helpers.asset('favicon.png');
            should.exist(rendered);
            String(rendered).should.equal('/blog/content/images/favicon.png');

            localSettingsCache.icon = '/content/images/favicon.ico';

            // with ghost set and ico
            rendered = helpers.asset('favicon.ico', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');

            // without ghost set and ico
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/blog/content/images/favicon.ico');
        });

        it('handles shared assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('shared/asset.js', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/shared/asset.js?v=abc');

            // without ghost set
            rendered = helpers.asset('shared/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/shared/asset.js?v=abc');
        });

        it('handles admin assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('js/asset.js', {hash: {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/ghost/assets/js/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/assets/js/asset.js?v=abc');
        });

        configUtils.restore();
    });
});
