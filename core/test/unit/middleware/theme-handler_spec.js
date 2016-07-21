var sinon        = require('sinon'),
    should       = require('should'),
    express      = require('express'),
    Promise      = require('bluebird'),

// Stuff we test
    fs           = require('fs'),
    hbs          = require('express-hbs'),
    themeHandler = require('../../../server/middleware/theme-handler'),
    errors       = require('../../../server/errors'),
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

    describe('ghostLocals', function () {
        it('sets all locals', function () {
            req.path = '/awesome-post';

            themeHandler.ghostLocals(req, res, next);

            res.locals.should.be.an.Object();
            should.exist(res.locals.version);
            should.exist(res.locals.safeVersion);
            res.locals.relativeUrl.should.equal(req.path);
            next.called.should.be.true();
        });
    });

    describe('activateTheme', function () {
        it('should activate new theme with partials', function () {
            var errorStub = sandbox.stub(errors, 'updateActiveTheme'),
                fsStub = sandbox.stub(fs, 'stat', function (path, cb) {
                    cb(null, {isDirectory: function () { return true; }});
                }),
                hbsStub = sandbox.spy(hbs, 'express3');

            themeHandler.activateTheme(blogApp, 'casper');

            errorStub.calledWith('casper').should.be.true();
            fsStub.calledOnce.should.be.true();
            hbsStub.calledOnce.should.be.true();
            hbsStub.firstCall.args[0].should.be.an.Object().and.have.property('partialsDir');
            hbsStub.firstCall.args[0].partialsDir.should.have.lengthOf(2);
            blogApp.get('activeTheme').should.equal('casper');
        });

        it('should activate new theme without partials', function () {
            var errorStub = sandbox.stub(errors, 'updateActiveTheme'),
                fsStub = sandbox.stub(fs, 'stat', function (path, cb) {
                    cb(null, null);
                }),
                hbsStub = sandbox.spy(hbs, 'express3');

            themeHandler.activateTheme(blogApp, 'casper');

            errorStub.calledWith('casper').should.be.true();
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

        it('handles secure context', function () {
            var themeOptSpy = sandbox.stub(hbs, 'updateTemplateOptions');
            req.secure = true;
            res.locals = {};
            configUtils.set({urlSSL: 'https://secure.blog'});

            themeHandler.configHbsForContext(req, res, next);

            themeOptSpy.calledOnce.should.be.true();
            themeOptSpy.firstCall.args[0].should.be.an.Object().and.have.property('data');
            themeOptSpy.firstCall.args[0].data.should.be.an.Object().and.have.property('blog');
            themeOptSpy.firstCall.args[0].data.blog.should.be.an.Object().and.have.property('url');
            themeOptSpy.firstCall.args[0].data.blog.url.should.eql('https://secure.blog');
            res.locals.secure.should.equal(true);
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
            var errorSpy = sandbox.spy(errors, 'throwError'),
                activateThemeSpy = sandbox.spy(themeHandler, 'activateTheme');

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
                errorSpy.called.should.be.true();
                activateThemeSpy.called.should.be.false();
                err.message.should.eql('The currently active theme "rasper" is missing.');
                done();
            });
        });

        it('throws only warns if theme is missing for admin req', function (done) {
            var errorSpy = sandbox.spy(errors, 'throwError'),
                warnSpy = sandbox.spy(errors, 'logWarn'),
                activateThemeSpy = sandbox.spy(themeHandler, 'activateTheme');

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
                errorSpy.called.should.be.false();
                activateThemeSpy.called.should.be.false();
                warnSpy.called.should.be.true();
                warnSpy.calledWith('The currently active theme "rasper" is missing.').should.be.true();
                done();
            });
        });
    });
});
