var sinon = require('sinon'),
    should = require('should'),
    express = require('express'),
    hbs = require('express-hbs'),
    themeUtils = require('../../../server/themes'),
    themeList = themeUtils.list,
    themeHandler = require('../../../server/middleware/theme-handler'),
    settingsCache = require('../../../server/settings/cache'),

    sandbox = sinon.sandbox.create();

describe('Theme Handler', function () {
    var req, res, next, blogApp, getActiveThemeStub;

    beforeEach(function () {
        req = sinon.spy();
        res = sinon.spy();
        next = sinon.spy();
        blogApp = express();
        req.app = blogApp;

        getActiveThemeStub = sandbox.stub(themeUtils, 'getActive').returns({});
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
                hasPartials: function () {return true;}
            });

            themeHandler.activateTheme(blogApp);

            hbsStub.calledOnce.should.be.true();
            hbsStub.firstCall.args[0].should.be.an.Object().and.have.property('partialsDir');
            hbsStub.firstCall.args[0].partialsDir.should.have.lengthOf(2);
            blogApp.get('activeTheme').should.equal('casper');
        });

        it('should activate new theme without partials', function () {
            getActiveThemeStub.returns({
                name: 'casper',
                hasPartials: function () {return false;}
            });

            themeHandler.activateTheme(blogApp);

            hbsStub.calledOnce.should.be.true();
            hbsStub.firstCall.args[0].should.be.an.Object().and.have.property('partialsDir');
            hbsStub.firstCall.args[0].partialsDir.should.have.lengthOf(1);
            blogApp.get('activeTheme').should.equal('casper');
        });
    });

    describe('configHbsForContext', function () {
        it('handles non secure context', function () {
            res.locals = {};
            themeHandler.configHbsForContext(req, res, next);

            should.not.exist(res.locals.secure);
            next.called.should.be.true();
        });

        it('sets view path', function () {
            req.secure = true;
            res.locals = {};
            blogApp.set('activeTheme', 'casper');

            themeHandler.configHbsForContext(req, res, next);

            blogApp.get('views').should.not.be.undefined();
        });

        it('sets view path', function () {
            req.secure = true;
            res.locals = {};
            blogApp.set('activeTheme', 'casper');

            themeHandler.configHbsForContext(req, res, next);

            blogApp.get('views').should.not.be.undefined();
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

            themeHandler.updateActiveTheme(req, res, function (err) {
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

            themeHandler.updateActiveTheme(req, res, function (err) {
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

            themeHandler.updateActiveTheme(req, res, function (err) {
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
