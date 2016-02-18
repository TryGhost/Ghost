/*globals describe, it, beforeEach */
var sinon        = require('sinon'),
    should       = require('should'),

    express      = require('express'),
    staticTheme  = require('../../../server/middleware/static-theme');

describe('staticTheme', function () {
    var next;

    beforeEach(function () {
        next = sinon.spy();
    });

    it('should call next if hbs file type', function () {
        var req = {
            path: 'mytemplate.hbs'
        };

        staticTheme(null)(req, null, next);
        next.called.should.be.true();
    });

    it('should call next if md file type', function () {
        var req = {
            path: 'README.md'
        };

        staticTheme(null)(req, null, next);
        next.called.should.be.true();
    });

    it('should call next if json file type', function () {
        var req = {
            path: 'sample.json'
        };

        staticTheme(null)(req, null, next);
        next.called.should.be.true();
    });

    it('should call express.static if valid file type', function (done) {
        var req = {
                path: 'myvalidfile.css',
                app: {
                    get: function () { return 'casper'; }
                }
            },
            activeThemeStub,
            sandbox = sinon.sandbox.create(),
            expressStatic = sinon.spy(express, 'static');

        activeThemeStub = sandbox.spy(req.app, 'get');

        staticTheme(null)(req, null, function (reqArg, res, next2) {
            /*jshint unused:false */
            sandbox.restore();
            next.called.should.be.false();
            activeThemeStub.called.should.be.true();
            expressStatic.called.should.be.true();
            should.exist(expressStatic.args[0][1].maxAge);
            done();
        });
    });

    it('should not error if active theme is missing', function (done) {
        var req = {
                path: 'myvalidfile.css',
                app: {
                    get: function () { return undefined; }
                }
            },
            activeThemeStub,
            sandbox = sinon.sandbox.create();

        activeThemeStub = sandbox.spy(req.app, 'get');

        staticTheme(null)(req, null, function (reqArg, res, next2) {
            /*jshint unused:false */
            sandbox.restore();
            next.called.should.be.false();
            done();
        });
    });
});
