const assert = require('node:assert/strict');
const sinon = require('sinon');
const config = require('../../../../../core/shared/config');

// is only exposed via themeEngine.getActive()
const activeTheme = require('../../../../../core/frontend/services/theme-engine/active');
const engine = require('../../../../../core/frontend/services/theme-engine/engine');
const assetHash = require('../../../../../core/frontend/services/asset-hash');

describe('Themes', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('Active', function () {
        describe('Mount', function () {
            let engineStub;
            let configStub;
            let fakeSettings;
            let fakeBlogApp;
            let fakeLoadedTheme;
            let fakeCheckedTheme;

            beforeEach(function () {
                engineStub = sinon.stub(engine, 'configure');
                configStub = sinon.stub(config, 'set');

                fakeSettings = {
                    locale: 'en'
                };

                fakeBlogApp = {
                    cache: ['stuff'],
                    set: sinon.stub(),
                    engine: sinon.stub()
                };

                fakeLoadedTheme = {
                    name: 'casper',
                    path: 'my/fake/theme/path'
                };
                fakeCheckedTheme = {
                    templates: {
                        all: ['post', 'about', 'post-hey', 'custom-test'],
                        custom: ['custom-test', 'post-hey']
                    }
                };
            });

            it('should mount active theme with partials', function () {
                // setup partials
                fakeCheckedTheme.partials = ['loop', 'navigation'];

                const theme = activeTheme.set(fakeSettings, fakeLoadedTheme, fakeCheckedTheme);

                // Check the theme is not yet mounted
                assert.equal(activeTheme.get().mounted, false);

                // Spy on assetHash.clearCache
                const clearCacheSpy = sinon.spy(assetHash, 'clearCache');

                // Call mount!
                theme.mount(fakeBlogApp);

                // Check the asset hash gets reset
                assert.equal(configStub.calledOnce, true);
                assert.equal(configStub.calledWith('assetHash', null), true);

                // Check the file-based asset hash cache is cleared
                sinon.assert.calledOnce(clearCacheSpy);

                // Check te view cache was cleared
                assert.deepEqual(fakeBlogApp.cache, {});

                // Check the views were set correctly
                assert.equal(fakeBlogApp.set.calledOnce, true);
                assert.equal(fakeBlogApp.set.calledWith('views', 'my/fake/theme/path'), true);

                // Check handlebars was configured correctly
                assert.equal(engineStub.calledOnce, true);
                assert.equal(engineStub.calledWith('my/fake/theme/path/partials'), true);

                // Check the theme is now mounted
                assert.equal(activeTheme.get().mounted, true);
            });

            it('should mount active theme without partials', function () {
                // setup partials
                fakeCheckedTheme.partials = [];

                const theme = activeTheme.set(fakeSettings, fakeLoadedTheme, fakeCheckedTheme);

                // Check the theme is not yet mounted
                assert.equal(activeTheme.get().mounted, false);

                // Spy on assetHash.clearCache
                const clearCacheSpy = sinon.spy(assetHash, 'clearCache');

                // Call mount!
                theme.mount(fakeBlogApp);

                // Check the asset hash gets reset
                assert.equal(configStub.calledOnce, true);
                assert.equal(configStub.calledWith('assetHash', null), true);

                // Check the file-based asset hash cache is cleared
                sinon.assert.calledOnce(clearCacheSpy);

                // Check te view cache was cleared
                assert.deepEqual(fakeBlogApp.cache, {});

                // Check the views were set correctly
                assert.equal(fakeBlogApp.set.calledOnce, true);
                assert.equal(fakeBlogApp.set.calledWith('views', 'my/fake/theme/path'), true);

                // Check handlebars was configured correctly
                assert.equal(engineStub.calledOnce, true);
                assert.equal(engineStub.calledWith(), true);

                // Check the theme is now mounted
                assert.equal(activeTheme.get().mounted, true);
            });
        });
    });
});
