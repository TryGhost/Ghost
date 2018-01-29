var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    configUtils = require('../../utils/configUtils'),
    helpers = require('../../../server/helpers'),
    settingsCache = require('../../../server/services/settings/cache'),
    fileCache = require('../../../server/services/file/cache'),
    sandbox = sinon.sandbox.create();

describe('{{asset}} helper', function () {
    var rendered, localSettingsCache = {}, originalGhostHash, originalThemeHash, publicAssetHash = 'def',
        themeAssetHash = 'abc';

    const returnPublicHashedPath = (path) => {
        return path.replace(/\.([js|css])/, '-' + publicAssetHash + '.' + '$1');
    };

    const returnThemeHashedPath = (path) => {
        return path.replace(/\.([js|css])/, '-' + themeAssetHash + '.' + '$1');
    };

    before(function () {
        sandbox.stub(fileCache.public, 'getHash').returns(publicAssetHash);

        configUtils.set({useMinFiles: true});

        sandbox.stub(settingsCache, 'get').callsFake(function (key) {
            if (key === 'theme_hash') {
                return themeAssetHash;
            }

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
            String(rendered).should.equal(returnPublicHashedPath('/public/ghost.css'));
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
            String(rendered).should.equal(returnPublicHashedPath('/public/asset.js'));
        });

        it('handles theme assets correctly', function () {
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal(returnThemeHashedPath('/assets/js/asset.js'));
        });

        it('handles hasMinFile assets correctly', function () {
            rendered = helpers.asset('js/asset.js', {hash: {hasMinFile: true}});
            should.exist(rendered);
            String(rendered).should.equal(returnThemeHashedPath('/assets/js/asset.min.js'));
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
            String(rendered).should.equal(returnPublicHashedPath('/blog/public/ghost.css'));
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
            String(rendered).should.equal(returnPublicHashedPath('/blog/public/asset.js'));
        });

        it('handles theme assets correctly', function () {
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal(returnThemeHashedPath('/blog/assets/js/asset.js'));
        });

        it('handles hasMinFile assets correctly', function () {
            rendered = helpers.asset('js/asset.js', {hash: {hasMinFile: true}});
            should.exist(rendered);
            String(rendered).should.equal(returnThemeHashedPath('/blog/assets/js/asset.min.js'));
        });

        configUtils.restore();
    });
});
