'use strict';

const should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    getAssetUrl = require('../../../../server/data/meta/asset_url'),
    fileCache = require('../../../../server/services/file/cache'),
    settingsCache = require('../../../../server/services/settings/cache'),
    configUtils = require('../../../utils/configUtils'),
    config = configUtils.config,
    sandbox = sinon.sandbox.create();

describe('getAssetUrl', function () {
    let originalGhostHash, publicAssetHash = '1234', themeAssetHash = '5678', localSettingsCache = {};

    const returnPublicHashedPath = (path) => {
        return path.replace(/\.([js|css])/, '-' + publicAssetHash + '.' + '$1');
    };

    const returnThemeHashedPath = (path) => {
        return path.replace(/\.([js|css])/, '-' + themeAssetHash + '.' + '$1');
    };

    beforeEach(function () {
        localSettingsCache = {};
        sandbox.stub(fileCache.public, 'getHash').returns(publicAssetHash);

        const originalFn = settingsCache.get;
        sandbox.stub(settingsCache, 'get')
            .callsFake(function (key) {
                if (key === 'theme_hash') {
                    return themeAssetHash;
                }

                if (localSettingsCache[key]) {
                    return localSettingsCache[key];
                }

                return originalFn(key);
            });
    });

    afterEach(function () {
        configUtils.restore();
        sandbox.restore();
    });

    it('should return asset url with just context', function () {
        var testUrl = getAssetUrl('myfile.js');
        testUrl.should.equal(returnThemeHashedPath('/assets/myfile.js'));
    });

    it('should return asset url with just context even with leading /', function () {
        var testUrl = getAssetUrl('/myfile.js');
        testUrl.should.equal(returnThemeHashedPath('/assets/myfile.js'));
    });

    it('should not add asset to url if ghost.css for default templates', function () {
        var testUrl = getAssetUrl('public/ghost.css');
        testUrl.should.equal(returnPublicHashedPath('/public/ghost.css'));
    });

    it('should not add asset to url has public in it', function () {
        var testUrl = getAssetUrl('public/myfile.js');
        testUrl.should.equal(returnPublicHashedPath('/public/myfile.js'));
    });

    describe('favicon', function () {
        it('should not add asset to url if favicon.ico', function () {
            var testUrl = getAssetUrl('favicon.ico');
            testUrl.should.equal('/favicon.ico');
        });

        it('should not add asset to url if favicon.png', function () {
            var testUrl = getAssetUrl('favicon.png');
            testUrl.should.equal('/favicon.ico');
        });

        it('should correct favicon path for custom png', function () {
            localSettingsCache['icon'] = '/content/images/2017/04/my-icon.png';
            var testUrl = getAssetUrl('favicon.ico');
            testUrl.should.equal('/favicon.png');
        });
    });

    describe('minify', function () {
        it('should return asset minified url when hasMinFile & useMinFiles are both set to true', function () {
            configUtils.set('useMinFiles', true);
            var testUrl = getAssetUrl('myfile.js', true);
            testUrl.should.equal(returnThemeHashedPath('/assets/myfile.min.js'));
        });

        it('should NOT return asset minified url when hasMinFile true but useMinFiles is false', function () {
            configUtils.set('useMinFiles', false);
            var testUrl = getAssetUrl('myfile.js', true);
            testUrl.should.equal(returnThemeHashedPath('/assets/myfile.js'));
        });

        it('should NOT return asset minified url when hasMinFile false but useMinFiles is true', function () {
            configUtils.set('useMinFiles', true);
            var testUrl = getAssetUrl('myfile.js', false);
            testUrl.should.equal(returnThemeHashedPath('/assets/myfile.js'));
        });

        it('should not add min to anything besides the last .', function () {
            configUtils.set('useMinFiles', true);
            var testUrl = getAssetUrl('test.page/myfile.js', true);
            testUrl.should.equal(returnThemeHashedPath('/assets/test.page/myfile.min.js'));
        });
    });

    describe('with /blog subdirectory', function () {
        beforeEach(function () {
            configUtils.set({url: 'http://localhost:82832/blog'});
        });

        it('should return asset url with just context', function () {
            var testUrl = getAssetUrl('myfile.js');
            testUrl.should.equal(returnThemeHashedPath('/blog/assets/myfile.js'));
        });

        it('should return asset url with just context even with leading /', function () {
            var testUrl = getAssetUrl('/myfile.js');
            testUrl.should.equal(returnThemeHashedPath('/blog/assets/myfile.js'));
        });

        it('should not add asset to url if ghost.css for default templates', function () {
            var testUrl = getAssetUrl('public/ghost.css');
            testUrl.should.equal(returnPublicHashedPath('/blog/public/ghost.css'));
        });

        it('should not add asset to url has public in it', function () {
            var testUrl = getAssetUrl('public/myfile.js');
            testUrl.should.equal(returnPublicHashedPath('/blog/public/myfile.js'));
        });

        describe('favicon', function () {
            it('should not add asset to url if favicon.ico', function () {
                var testUrl = getAssetUrl('favicon.ico');
                testUrl.should.equal('/blog/favicon.ico');
            });

            it('should not add asset to url if favicon.png', function () {
                var testUrl = getAssetUrl('favicon.png');
                testUrl.should.equal('/blog/favicon.ico');
            });

            it('should return correct favicon path for custom png', function () {
                localSettingsCache['icon'] = '/content/images/2017/04/my-icon.png';
                var testUrl = getAssetUrl('favicon.ico');
                testUrl.should.equal('/blog/favicon.png');
            });
        });

        describe('minify', function () {
            it('should return asset minified url when hasMinFile & useMinFiles are both set to true', function () {
                configUtils.set('useMinFiles', true);
                var testUrl = getAssetUrl('myfile.js', true);
                testUrl.should.equal(returnThemeHashedPath('/blog/assets/myfile.min.js'));
            });

            it('should NOT return asset minified url when hasMinFile true but useMinFiles is false', function () {
                configUtils.set('useMinFiles', false);
                var testUrl = getAssetUrl('myfile.js', true);
                testUrl.should.equal(returnThemeHashedPath('/blog/assets/myfile.js'));
            });

            it('should NOT return asset minified url when hasMinFile false but useMinFiles is true', function () {
                configUtils.set('useMinFiles', true);
                var testUrl = getAssetUrl('myfile.js', false);
                testUrl.should.equal(returnThemeHashedPath('/blog/assets/myfile.js'));
            });

            it('should not add min to anything besides the last .', function () {
                configUtils.set('useMinFiles', true);
                var testUrl = getAssetUrl('test.page/myfile.js', true);
                testUrl.should.equal(returnThemeHashedPath('/blog/assets/test.page/myfile.min.js'));
            });
        });
    });
});
