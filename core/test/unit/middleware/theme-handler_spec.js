var sinon = require('sinon'),
    should = require('should'),
    express = require('express'),
    hbs = require('express-hbs'),
    configUtils = require('../../utils/configUtils'),
    themeUtils = require('../../../server/themes'),
    themeList = themeUtils.list,
    themeHandler = require('../../../server/middleware/theme-handler'),
    settingsCache = require('../../../server/settings/cache'),

    sandbox = sinon.sandbox.create();

describe('Theme Handler', function () {
    var req, res, blogApp, getActiveThemeStub;

    beforeEach(function () {
        req = sinon.spy();
        res = sinon.spy();
        blogApp = express();
        req.app = blogApp;

        getActiveThemeStub = sandbox.stub(themeUtils, 'getActive').returns({
            config: sandbox.stub()
        });
    });

    afterEach(function () {
        sandbox.restore();
        themeList.init();
    });

    describe('activateTheme', function () {
        var hbsStub;

        beforeEach(function () {
            hbsStub = sandbox.spy(hbs, 'express3');
        });

        it('should activate new theme with partials', function () {
            getActiveThemeStub.returns({
                name: 'casper',
                path: 'my/fake/path',
                partialsPath: 'my/fake/path/partials',
                hasPartials: function () {return true;}
            });

            themeHandler.activateTheme(blogApp);

            // hasPartials, partialsPath, path & name
            getActiveThemeStub.callCount.should.be.eql(4);
            hbsStub.calledOnce.should.be.true();
            hbsStub.firstCall.args[0].should.be.an.Object().and.have.property('partialsDir');
            hbsStub.firstCall.args[0].partialsDir.should.be.an.Array().with.lengthOf(2);
            hbsStub.firstCall.args[0].partialsDir[1].should.eql('my/fake/path/partials');

            // Check the asset hash gets reset
            should(configUtils.config.get('assetHash')).eql(null);

            blogApp.get('activeTheme').should.equal('casper');
            blogApp.get('views').should.eql('my/fake/path');
        });

        it('should activate new theme without partials', function () {
            getActiveThemeStub.returns({
                name: 'casper',
                path: 'my/fake/path',
                hasPartials: function () {return false;}
            });

            themeHandler.activateTheme(blogApp);

            // hasPartials, path & name
            getActiveThemeStub.callCount.should.eql(3);
            hbsStub.calledOnce.should.be.true();
            hbsStub.firstCall.args[0].should.be.an.Object().and.have.property('partialsDir');
            hbsStub.firstCall.args[0].partialsDir.should.have.lengthOf(1);

            // Check the asset hash gets reset
            should(configUtils.config.get('assetHash')).eql(null);

            blogApp.get('activeTheme').should.equal('casper');
            blogApp.get('views').should.eql('my/fake/path');
        });
    });

    // NOTE: These tests are totally dependent on the previous tests
    // @TODO: properly fix these tests once theme refactor is finished
    describe('configHbsForContext', function () {
        var updateOptionsSpy;

        beforeEach(function () {
            updateOptionsSpy = sandbox.spy(hbs, 'updateTemplateOptions');
        });

        it('handles non secure context', function (done) {
            res.locals = {};
            themeHandler.configHbsForContext(req, res, function next() {
                updateOptionsSpy.calledOnce.should.be.true();
                should.not.exist(res.locals.secure);

                done();
            });
        });

        it('handles secure context', function (done) {
            req.secure = true;
            res.locals = {};
            themeHandler.configHbsForContext(req, res, function next() {
                updateOptionsSpy.calledOnce.should.be.true();
                should.exist(res.locals.secure);
                res.locals.secure.should.be.true();

                done();
            });
        });
    });

    describe('updateActiveTheme', function () {
        var activateThemeStub,
            settingsCacheStub;

        beforeEach(function () {
            activateThemeStub = sandbox.stub(themeHandler, 'activateTheme');
            settingsCacheStub = sandbox.stub(settingsCache, 'get').withArgs('activeTheme').returns('casper');
        });

        it('updates the active theme if changed', function (done) {
            blogApp.set('activeTheme', 'not-casper');

            themeHandler.updateActiveTheme(req, res, function next(err) {
                // Did not throw an error
                should.not.exist(err);

                settingsCacheStub.calledWith('activeTheme').should.be.true();
                getActiveThemeStub.called.should.be.true();
                activateThemeStub.called.should.be.true();
                activateThemeStub.calledWith(blogApp).should.be.true();

                done();
            });
        });

        it('does not update the active theme if not changed', function (done) {
            blogApp.set('activeTheme', 'casper');

            themeHandler.updateActiveTheme(req, res, function next(err) {
                // Did not throw an error
                should.not.exist(err);

                settingsCacheStub.calledWith('activeTheme').should.be.true();
                getActiveThemeStub.called.should.be.true();
                activateThemeStub.called.should.be.false();

                done();
            });
        });

        it('throws error if theme is missing', function (done) {
            getActiveThemeStub.returns(undefined);

            themeHandler.updateActiveTheme(req, res, function next(err) {
                // Did throw an error
                should.exist(err);
                err.message.should.eql('The currently active theme "casper" is missing.');

                settingsCacheStub.calledWith('activeTheme').should.be.true();
                getActiveThemeStub.called.should.be.true();
                activateThemeStub.called.should.be.false();

                done();
            });
        });
    });
});
