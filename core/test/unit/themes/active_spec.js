var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),

    config = require('../../../server/config'),
    // is only exposed via themes.getActive()
    activeTheme = require('../../../server/themes/active'),
    engine = require('../../../server/themes/engine'),

    sandbox = sinon.sandbox.create();

describe('Themes', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('Active', function () {
        describe('Mount', function () {
            var engineStub, configStub,
                fakeBlogApp, fakeLoadedTheme, fakeCheckedTheme;

            beforeEach(function () {
                engineStub = sandbox.stub(engine, 'configure');
                configStub = sandbox.stub(config, 'set');

                fakeBlogApp = {
                    cache: ['stuff'],
                    set: sandbox.stub(),
                    engine: sandbox.stub()
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

                var theme = activeTheme.set(fakeLoadedTheme, fakeCheckedTheme);

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

                var theme = activeTheme.set(fakeLoadedTheme, fakeCheckedTheme);

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
