var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    hbs = require('express-hbs'),

    config = require('../../../server/config'),
    // is only exposed via themes.getActive()
    activeTheme = require('../../../server/themes/active'),

    sandbox = sinon.sandbox.create();

describe('Themes', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('Active', function () {
        describe('Mount', function () {
            var hbsStub, configStub,
                fakeBlogApp, fakeLoadedTheme, fakeCheckedTheme;

            beforeEach(function () {
                hbsStub = sandbox.stub(hbs, 'express3');
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
                fakeCheckedTheme = {};
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

                // Check handlebars was initialised correctly
                hbsStub.calledOnce.should.be.true();
                hbsStub.firstCall.args[0].should.be.an.Object().and.have.property('partialsDir');
                hbsStub.firstCall.args[0].partialsDir.should.be.an.Array().with.lengthOf(2);
                hbsStub.firstCall.args[0].partialsDir[1].should.eql('my/fake/theme/path/partials');

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

                // Check handlebars was initialised correctly
                hbsStub.calledOnce.should.be.true();
                hbsStub.firstCall.args[0].should.be.an.Object().and.have.property('partialsDir');
                hbsStub.firstCall.args[0].partialsDir.should.have.lengthOf(1);

                // Check the theme is now mounted
                activeTheme.get().mounted.should.be.true();
            });
        });
    });
});
