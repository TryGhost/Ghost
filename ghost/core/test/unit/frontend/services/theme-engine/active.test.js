const should = require('should');
const sinon = require('sinon');
const config = require('../../../../../core/shared/config');

// is only exposed via themeEngine.getActive()
const activeTheme = require('../../../../../core/frontend/services/theme-engine/active');
const engine = require('../../../../../core/frontend/services/theme-engine/engine');

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
                activeTheme.get().mounted.should.be.false();

                // Call mount!
                theme.mount(fakeBlogApp);

                // Check the asset hash gets reset
                configStub.calledOnce.should.be.true();
                configStub.calledWith('assetHash', null).should.be.true();

                // Check te view cache was cleared
                fakeBlogApp.cache.should.eql({});

                // Check the views were set correctly
                fakeBlogApp.set.calledOnce.should.be.true();
                fakeBlogApp.set.calledWith('views', 'my/fake/theme/path').should.be.true();

                // Check handlebars was configured correctly
                engineStub.calledOnce.should.be.true();
                engineStub.calledWith('my/fake/theme/path/partials').should.be.true();

                // Check the theme is now mounted
                activeTheme.get().mounted.should.be.true();
            });

            it('should mount active theme without partials', function () {
                // setup partials
                fakeCheckedTheme.partials = [];

                const theme = activeTheme.set(fakeSettings, fakeLoadedTheme, fakeCheckedTheme);

                // Check the theme is not yet mounted
                activeTheme.get().mounted.should.be.false();

                // Call mount!
                theme.mount(fakeBlogApp);

                // Check the asset hash gets reset
                configStub.calledOnce.should.be.true();
                configStub.calledWith('assetHash', null).should.be.true();

                // Check te view cache was cleared
                fakeBlogApp.cache.should.eql({});

                // Check the views were set correctly
                fakeBlogApp.set.calledOnce.should.be.true();
                fakeBlogApp.set.calledWith('views', 'my/fake/theme/path').should.be.true();

                // Check handlebars was configured correctly
                engineStub.calledOnce.should.be.true();
                engineStub.calledWith().should.be.true();

                // Check the theme is now mounted
                activeTheme.get().mounted.should.be.true();
            });
        });
    });
});
