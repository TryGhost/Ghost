var sinon        = require('sinon'),
    should       = require('should'),
    express      = require('express'),
    Promise      = require('bluebird'),
    fs           = require('fs'),
    hbs          = require('express-hbs'),
    themeHandler = require('../../../server/middleware/theme-handler'),
    logging      = require('../../../server/logging'),
    api          = require('../../../server/api'),
    configUtils  = require('../../utils/configUtils'),
    sandbox      = sinon.sandbox.create();

describe('Theme Handler', function () {
    var req, res, next, blogApp;

    beforeEach(function () {
        req = sinon.spy();
        res = sinon.spy();
        next = sinon.spy();
        blogApp = express();
        req.app = blogApp;
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    describe('activateTheme', function () {
        it('should activate new theme with partials', function () {
            var fsStub = sandbox.stub(fs, 'stat', function (path, cb) {
                    cb(null, {isDirectory: function () { return true; }});
                }),
                hbsStub = sandbox.spy(hbs, 'express3');

            themeHandler.activateTheme(blogApp, 'casper');

            fsStub.calledOnce.should.be.true();
            hbsStub.calledOnce.should.be.true();
            hbsStub.firstCall.args[0].should.be.an.Object().and.have.property('partialsDir');
            hbsStub.firstCall.args[0].partialsDir.should.have.lengthOf(2);
            blogApp.get('activeTheme').should.equal('casper');
        });

        it('should activate new theme without partials', function () {
            var fsStub = sandbox.stub(fs, 'stat', function (path, cb) {
                    cb(null, null);
                }),
                hbsStub = sandbox.spy(hbs, 'express3');

            themeHandler.activateTheme(blogApp, 'casper');

            fsStub.calledOnce.should.be.true();
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
        it('updates the active theme if changed', function (done) {
            var activateThemeSpy = sandbox.spy(themeHandler, 'activateTheme');

            sandbox.stub(api.settings, 'read').withArgs(sandbox.match.has('key', 'activeTheme')).returns(Promise.resolve({
                settings: [{
                    key: 'activeKey',
                    value: 'casper'
                }]
            }));
            blogApp.set('activeTheme', 'not-casper');
            configUtils.set({paths: {availableThemes: {casper: {}}}});

            themeHandler.updateActiveTheme(req, res, function () {
                activateThemeSpy.called.should.be.true();
                done();
            });
        });

        it('does not update the active theme if not changed', function (done) {
            var activateThemeSpy = sandbox.spy(themeHandler, 'activateTheme');
            sandbox.stub(api.settings, 'read').withArgs(sandbox.match.has('key', 'activeTheme')).returns(Promise.resolve({
                settings: [{
                    key: 'activeKey',
                    value: 'casper'
                }]
            }));
            blogApp.set('activeTheme', 'casper');
            configUtils.set({paths: {availableThemes: {casper: {}}}});

            themeHandler.updateActiveTheme(req, res, function () {
                activateThemeSpy.called.should.be.false();
                done();
            });
        });

        it('throws error if theme is missing', function (done) {
            var activateThemeSpy = sandbox.spy(themeHandler, 'activateTheme');

            sandbox.stub(api.settings, 'read').withArgs(sandbox.match.has('key', 'activeTheme')).returns(Promise.resolve({
                settings: [{
                    key: 'activeKey',
                    value: 'rasper'
                }]
            }));

            blogApp.set('activeTheme', 'not-casper');
            configUtils.set({paths: {availableThemes: {casper: {}}}});

            themeHandler.updateActiveTheme(req, res, function (err) {
                should.exist(err);
                activateThemeSpy.called.should.be.false();
                err.message.should.eql('The currently active theme "rasper" is missing.');
                done();
            });
        });

        it('throws only warns if theme is missing for admin req', function (done) {
            var activateThemeSpy = sandbox.spy(themeHandler, 'activateTheme'),
                loggingWarnStub = sandbox.spy(logging, 'warn');

            sandbox.stub(api.settings, 'read').withArgs(sandbox.match.has('key', 'activeTheme')).returns(Promise.resolve({
                settings: [{
                    key: 'activeKey',
                    value: 'rasper'
                }]
            }));

            res.isAdmin = true;
            blogApp.set('activeTheme', 'not-casper');
            configUtils.set({paths: {availableThemes: {casper: {}}}});

            themeHandler.updateActiveTheme(req, res, function () {
                activateThemeSpy.called.should.be.false();
                loggingWarnStub.called.should.be.true();
                loggingWarnStub.calledWith('The currently active theme "rasper" is missing.').should.be.true();
                done();
            });
        });
    });
});
