/*globals describe, it, beforeEach, afterEach */
/*jshint expr:true*/
var _            = require('lodash'),
    sinon        = require('sinon'),
    should       = require('should'),
    express      = require('express'),

    // Stuff we test
    themeHandler = require('../../../server/middleware/theme-handler'),
    errors       = require('../../../server/errors'),

    config   = require('../../../server/config'),
    origConfig = _.cloneDeep(config),
    defaultConfig  = require('../../../../config.example')[process.env.NODE_ENV];

should.equal(true, true);

describe('Theme Handler', function () {
    var req, res, next, blogApp, handler, sandbox;

    beforeEach(function () {
        req = sinon.spy();
        res = sinon.spy();
        next = sinon.spy();
        blogApp = express();
        handler = themeHandler(blogApp);
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();

        // Reset config
        config.set(_.merge({}, origConfig, defaultConfig));
    });

    describe('ghostLocals', function () {
        it('sets all locals', function () {
            req.path = '/awesome-post';

            handler.ghostLocals(req, res, next);

            res.locals.should.be.an.Object;
            res.locals.version.should.exist;
            res.locals.safeVersion.should.exist;
            res.locals.relativeUrl.should.equal(req.path);
            next.called.should.be.true;
        });
    });

    describe('activateTheme', function () {
        it('should activate new theme', function () {
            var errorStub = sandbox.stub(errors, 'updateActiveTheme');
            handler.activateTheme('casper');

            errorStub.calledWith('casper').should.be.true;
            blogApp.get('activeTheme').should.equal('casper');
        });
    });

    describe('configHbsForContext', function () {
        it('calls next', function () {
            req.secure = true;
            res.locals = {};
            handler.configHbsForContext(req, res, next);

            next.called.should.be.true;
        });

        it('sets secure local variable', function () {
            req.secure = true;
            res.locals = {};

            handler.configHbsForContext(req, res, next);

            res.locals.secure.should.equal(req.secure);
        });

        it('sets view path', function () {
            req.secure = true;
            res.locals = {};
            blogApp.set('activeTheme', 'casper');

            handler.configHbsForContext(req, res, next);

            blogApp.get('views').should.not.be.undefined;
        });
    });

    // describe('updateActiveTheme', function () {
    //     it('updates the active theme if changed', function () {
    //         var activateThemeSpy = sinon.spy(handler, 'activateTheme');
    //         sandbox.stub(api.settings, 'read').withArgs(sinon.match.has('key', 'activeTheme')).returns(Promise.resolve({
    //             settings: [{
    //                 key: 'activeKey',
    //                 value: 'casper'
    //             }]
    //         }));
    //         blogApp.set('activeTheme', 'not-casper');
    //         config.set({paths: {availableThemes: {casper: {}}}});
    //
    //         handler.updateActiveTheme(req, res, next);
    //
    //         activateThemeSpy.called.should.be.false;
    //         next.called.should.be.false;
    //     });
    //
    //     it('throws error if theme is missing', function () {
    //         var errorSpy = sinon.spy(errors, 'throwError');
    //         sandbox.stub(api.settings, 'read').withArgs(sinon.match.has('key', 'activeTheme')).returns(Promise.resolve({
    //             settings: [{
    //                 key: 'activeKey',
    //                 value: 'rasper'
    //             }]
    //         }));
    //         blogApp.set('activeTheme', 'not-casper');
    //         config.set({paths: {availableThemes: {casper: {}}}});
    //
    //         handler.updateActiveTheme(req, res, next);
    //
    //         errorSpy.called.should.be.true;
    //         next.called.should.be.false;
    //     });
    // });
});
