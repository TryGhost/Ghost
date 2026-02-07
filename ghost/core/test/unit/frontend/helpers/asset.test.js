// NOTE: the sole purpose of this suite is to test is it calls through to getAssetUrlHelper
//       more complicated use cases are tested directly in asset_url.spec

const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');
const configUtils = require('../../../utils/config-utils');
const config = configUtils.config;
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

    after(async function () {
        await configUtils.restore();
        sinon.restore();
    });

    describe('no subdirectory', function () {
        it('handles favicon correctly', function () {
            rendered = asset('favicon.ico');
            assertExists(rendered);
            assert.equal(String(rendered), '/favicon.ico');
        });

        it('handles ghost.css for default templates correctly', function () {
            rendered = asset('public/ghost.css');
            assertExists(rendered);
            assert.equal(String(rendered), '/public/ghost.css?v=abc');
        });

        it('handles custom favicon correctly', function () {
            // with png
            localSettingsCache.icon = '/content/images/favicon.png';
            rendered = asset('favicon.png');
            assertExists(rendered);
            assert.equal(String(rendered), '/content/images/size/w256h256/favicon.png');

            // with ico
            localSettingsCache.icon = '/content/images/favicon.ico';
            rendered = asset('favicon.ico');
            assertExists(rendered);
            assert.equal(String(rendered), '/content/images/favicon.ico');

            // with webp
            localSettingsCache.icon = '/content/images/favicon.webp';
            rendered = asset('favicon.png');
            assertExists(rendered);
            assert.equal(String(rendered), '/content/images/size/w256h256/format/png/favicon.webp');

            // with svg
            localSettingsCache.icon = '/content/images/favicon.svg';
            rendered = asset('favicon.png');
            assertExists(rendered);
            assert.equal(String(rendered), '/content/images/size/w256h256/format/png/favicon.svg');
        });

        it('handles public assets correctly', function () {
            localSettingsCache.icon = '';

            rendered = asset('public/asset.js');
            assertExists(rendered);
            assert.equal(String(rendered), '/public/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            rendered = asset('js/asset.js');
            assertExists(rendered);
            assert.equal(String(rendered), '/assets/js/asset.js?v=abc');
        });

        it('handles hasMinFile assets correctly', function () {
            rendered = asset('js/asset.js', {hash: {hasMinFile: true}});
            assertExists(rendered);
            assert.equal(String(rendered), '/assets/js/asset.min.js?v=abc');
        });
    });

    describe('different admin and site urls', function () {
        before(function () {
            configUtils.set({url: 'http://127.0.0.1'});
            configUtils.set({'admin:url': 'http://localhost'});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('handles favicon correctly', function () {
            rendered = asset('favicon.ico');
            assertExists(rendered);
            assert.equal(String(rendered), 'http://127.0.0.1/favicon.ico');
        });

        it('handles ghost.css for default templates correctly', function () {
            rendered = asset('public/ghost.css');
            assertExists(rendered);
            assert.equal(String(rendered), 'http://127.0.0.1/public/ghost.css?v=abc');
        });
    });

    describe('with contentBasedHash enabled', function () {
        before(function () {
            configUtils.set({assetHash: 'abc'});
            configUtils.set({'caching:assets:contentBasedHash:enabled': true});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('uses file-based hash for ghost.css when it exists', function () {
            rendered = asset('public/ghost.css');
            assertExists(rendered);
            // ghost.css exists in static public path, so it gets a 16-char base64url hash
            assert.match(String(rendered), /^\/public\/ghost\.css\?v=[A-Za-z0-9_-]{16}$/);
        });

        it('falls back to global hash for non-existent public assets', function () {
            rendered = asset('public/nonexistent.js');
            assertExists(rendered);
            // Non-existent files fall back to global hash (using config value)
            assert.equal(String(rendered), '/public/nonexistent.js?v=' + config.get('assetHash'));
        });

        it('falls back to global hash for theme assets without active theme', function () {
            rendered = asset('js/asset.js');
            assertExists(rendered);
            // No active theme, so falls back to global hash (using config value)
            assert.equal(String(rendered), '/assets/js/asset.js?v=' + config.get('assetHash'));
        });
    });
});
