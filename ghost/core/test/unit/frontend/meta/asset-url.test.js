const assert = require('node:assert/strict');
const sinon = require('sinon');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const {SafeString} = require('../../../../core/frontend/services/handlebars');
const imageLib = require('../../../../core/server/lib/image');
const settingsCache = require('../../../../core/shared/settings-cache');
const configUtils = require('../../../utils/config-utils');
const config = configUtils.config;
const themeEngine = require('../../../../core/frontend/services/theme-engine');
const assetHash = require('../../../../core/frontend/services/asset-hash');

const getAssetUrl = require('../../../../core/frontend/meta/asset-url');

describe('getAssetUrl', function () {
    afterEach(async function () {
        await configUtils.restore();
        sinon.restore();
    });

    it('should return asset url with just context', function () {
        const testUrl = getAssetUrl('myfile.js');
        assert.equal(testUrl, '/assets/myfile.js?v=' + config.get('assetHash'));
    });

    it('should return asset url with just context even with leading /', function () {
        const testUrl = getAssetUrl('/myfile.js');
        assert.equal(testUrl, '/assets/myfile.js?v=' + config.get('assetHash'));
    });

    it('should not add asset to url if ghost.css for default templates', function () {
        const testUrl = getAssetUrl('public/ghost.css');
        // Without caching:assets:contentBasedHash, uses global hash
        assert.equal(testUrl, '/public/ghost.css?v=' + config.get('assetHash'));
    });

    it('should not add asset to url has public in it', function () {
        const testUrl = getAssetUrl('public/myfile.js');
        // Non-existent public files fall back to global hash
        assert.equal(testUrl, '/public/myfile.js?v=' + config.get('assetHash'));
    });

    it('should return hash before #', function () {
        const testUrl = getAssetUrl('myfile.svg#arrow-up');
        assert.equal(testUrl, `/assets/myfile.svg?v=${config.get('assetHash')}#arrow-up`);
    });

    it('should handle Handlebars’ SafeString', function () {
        const testUrl = getAssetUrl(new SafeString('myfile.js'));
        assert.equal(testUrl, '/assets/myfile.js?v=' + config.get('assetHash'));
    });

    describe('favicon', function () {
        it('should not add asset to url if favicon.ico', function () {
            const testUrl = getAssetUrl('favicon.ico');
            assert.equal(testUrl, '/favicon.ico');
        });

        it('should not add asset to url if favicon.png', function () {
            const testUrl = getAssetUrl('favicon.png');
            assert.equal(testUrl, '/favicon.ico');
        });

        it('should correct favicon path for custom png', function () {
            sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.png');
            const testUrl = getAssetUrl('favicon.ico');
            assert.equal(testUrl, '/content/images/size/w256h256/2017/04/my-icon.png');
        });

        it('should correct favicon path for custom svg', function () {
            sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.svg');
            const testUrl = getAssetUrl('favicon.ico');
            assert.equal(testUrl, '/content/images/size/w256h256/format/png/2017/04/my-icon.svg');
        });
    });

    describe('minify', function () {
        it('should return asset minified url when hasMinFile & useMinFiles are both set to true', function () {
            configUtils.set('useMinFiles', true);
            const testUrl = getAssetUrl('myfile.js', true);
            assert.equal(testUrl, '/assets/myfile.min.js?v=' + config.get('assetHash'));
        });

        it('should NOT return asset minified url when hasMinFile true but useMinFiles is false', function () {
            configUtils.set('useMinFiles', false);
            const testUrl = getAssetUrl('myfile.js', true);
            assert.equal(testUrl, '/assets/myfile.js?v=' + config.get('assetHash'));
        });

        it('should NOT return asset minified url when hasMinFile false but useMinFiles is true', function () {
            configUtils.set('useMinFiles', true);
            const testUrl = getAssetUrl('myfile.js', false);
            assert.equal(testUrl, '/assets/myfile.js?v=' + config.get('assetHash'));
        });

        it('should not add min to anything besides the last .', function () {
            configUtils.set('useMinFiles', true);
            const testUrl = getAssetUrl('test.page/myfile.js', true);
            assert.equal(testUrl, '/assets/test.page/myfile.min.js?v=' + config.get('assetHash'));
        });
    });

    describe('with /blog subdirectory', function () {
        beforeEach(function () {
            configUtils.set({url: 'http://localhost:65535/blog'});
        });

        afterEach(async function () {
            await configUtils.restore();
        });

        it('should return asset url with just context', function () {
            const testUrl = getAssetUrl('myfile.js');
            assert.equal(testUrl, '/blog/assets/myfile.js?v=' + config.get('assetHash'));
        });

        it('should return asset url with just context even with leading /', function () {
            const testUrl = getAssetUrl('/myfile.js');
            assert.equal(testUrl, '/blog/assets/myfile.js?v=' + config.get('assetHash'));
        });

        it('should not add asset to url if ghost.css for default templates', function () {
            const testUrl = getAssetUrl('public/ghost.css');
            // Without caching:assets:contentBasedHash, uses global hash
            assert.equal(testUrl, '/blog/public/ghost.css?v=' + config.get('assetHash'));
        });

        it('should not add asset to url has public in it', function () {
            const testUrl = getAssetUrl('public/myfile.js');
            // Non-existent public files fall back to global hash
            assert.equal(testUrl, '/blog/public/myfile.js?v=' + config.get('assetHash'));
        });

        describe('favicon', function () {
            it('should not add asset to url if favicon.ico', function () {
                sinon.stub(imageLib.blogIcon, 'getIconUrl').returns('/blog/favicon.ico');
                const testUrl = getAssetUrl('favicon.ico');
                assert.equal(testUrl, '/blog/favicon.ico');
            });

            it('should not add asset to url if favicon.png', function () {
                sinon.stub(imageLib.blogIcon, 'getIconUrl').returns('/blog/favicon.ico');
                const testUrl = getAssetUrl('favicon.png');
                assert.equal(testUrl, '/blog/favicon.ico');
            });

            it('should return correct favicon path for custom png', function () {
                sinon.stub(imageLib.blogIcon, 'getIconUrl').returns('/blog/favicon.png');
                sinon.stub(settingsCache, 'get').withArgs('icon').returns('/content/images/2017/04/my-icon.png');
                const testUrl = getAssetUrl('favicon.ico');
                assert.equal(testUrl, '/blog/favicon.png');
            });
        });

        describe('minify', function () {
            it('should return asset minified url when hasMinFile & useMinFiles are both set to true', function () {
                configUtils.set('useMinFiles', true);
                const testUrl = getAssetUrl('myfile.js', true);
                assert.equal(testUrl, '/blog/assets/myfile.min.js?v=' + config.get('assetHash'));
            });

            it('should NOT return asset minified url when hasMinFile true but useMinFiles is false', function () {
                configUtils.set('useMinFiles', false);
                const testUrl = getAssetUrl('myfile.js', true);
                assert.equal(testUrl, '/blog/assets/myfile.js?v=' + config.get('assetHash'));
            });

            it('should NOT return asset minified url when hasMinFile false but useMinFiles is true', function () {
                configUtils.set('useMinFiles', true);
                const testUrl = getAssetUrl('myfile.js', false);
                assert.equal(testUrl, '/blog/assets/myfile.js?v=' + config.get('assetHash'));
            });

            it('should not add min to anything besides the last .', function () {
                configUtils.set('useMinFiles', true);
                const testUrl = getAssetUrl('test.page/myfile.js', true);
                assert.equal(testUrl, '/blog/assets/test.page/myfile.min.js?v=' + config.get('assetHash'));
            });
        });
    });

    describe('file-based hash', function () {
        const fixturesPath = path.join(__dirname, '../../../utils/fixtures/themes/casper');

        beforeEach(function () {
            // Enable content-based asset hashing
            configUtils.set('caching:assets:contentBasedHash:enabled', true);
        });

        afterEach(function () {
            assetHash.clearCache();
            sinon.restore();
        });

        it('should use SHA256 hash of file content when theme asset exists', function () {
            // Mock active theme
            sinon.stub(themeEngine, 'getActive').returns({
                path: fixturesPath
            });

            // Use the built/screen.css file that exists in the casper fixture
            const testFile = 'built/screen.css';
            const fullPath = path.join(fixturesPath, 'assets', testFile);
            const content = fs.readFileSync(fullPath);
            const expectedHash = crypto.createHash('sha256')
                .update(content)
                .digest('base64url')
                .substring(0, 16);

            const testUrl = getAssetUrl(testFile);
            assert.equal(testUrl, `/assets/${testFile}?v=${expectedHash}`);
        });

        it('should fallback to global hash when theme asset file does not exist', function () {
            // Mock active theme
            sinon.stub(themeEngine, 'getActive').returns({
                path: fixturesPath
            });

            // Request a non-existent file
            const testUrl = getAssetUrl('nonexistent/file.js');

            // Should use global hash since file doesn't exist
            assert.equal(testUrl, '/assets/nonexistent/file.js?v=' + config.get('assetHash'));
        });

        it('should fallback to global hash when no active theme', function () {
            // Mock no active theme
            sinon.stub(themeEngine, 'getActive').returns(null);

            const testUrl = getAssetUrl('myfile.js');

            // Should use global hash
            assert.equal(testUrl, '/assets/myfile.js?v=' + config.get('assetHash'));
        });

        it('should use file-based hash for public assets when file exists', function () {
            // Public assets use file-based hash when the file exists and config is enabled
            const testUrl = getAssetUrl('public/ghost.css');
            // ghost.css exists in the static public path, so it should have a file-based hash (base64url encoded)
            assert.match(testUrl, /^\/public\/ghost\.css\?v=[A-Za-z0-9_-]{16}$/);
        });

        it('should fallback to global hash for non-existent public assets', function () {
            // Non-existent public files fall back to global hash
            const testUrl = getAssetUrl('public/nonexistent.css');
            assert.equal(testUrl, '/public/nonexistent.css?v=' + config.get('assetHash'));
        });

        it('should return different hashes for different theme asset files', function () {
            // Mock active theme with real files
            sinon.stub(themeEngine, 'getActive').returns({
                path: fixturesPath
            });

            // Use built/screen.css and built/casper.js which exist in casper fixture
            const cssUrl = getAssetUrl('built/screen.css');
            const jsUrl = getAssetUrl('built/casper.js');

            // Extract hashes
            const cssHash = cssUrl.match(/\?v=([A-Za-z0-9_-]+)/)[1];
            const jsHash = jsUrl.match(/\?v=([A-Za-z0-9_-]+)/)[1];

            // Hashes should be different for different files
            assert.notEqual(cssHash, jsHash);
        });

        it('should prevent path traversal in theme assets', function () {
            // Mock active theme
            sinon.stub(themeEngine, 'getActive').returns({
                path: fixturesPath
            });

            // Attempt path traversal - should fallback to global hash, not read arbitrary files
            const testUrl = getAssetUrl('../../../package.json');

            // Should use global hash because path traversal is blocked
            assert.equal(testUrl, '/assets/../../../package.json?v=' + config.get('assetHash'));
        });

        it('should prevent path traversal in public assets', function () {
            // Attempt path traversal in public assets
            const testUrl = getAssetUrl('public/../../../package.json');

            // Should use global hash because path traversal is blocked
            assert.equal(testUrl, '/public/../../../package.json?v=' + config.get('assetHash'));
        });
    });
});
