/*globals describe, it, beforeEach */
/*jshint expr:true*/
var sinon        = require('sinon'),
    should       = require('should'),

    express      = require('express'),
    staticTheme  = require('../../../server/middleware/static-theme');

should.equal(true, true);

describe('staticTheme', function () {
    var next;

    beforeEach(function () {
        next = sinon.spy();
    });

    it('should call next if hbs file type', function () {
        var req = {
            url: 'mytemplate.hbs'
        };

        staticTheme(null)(req, null, next);
        next.called.should.be.true;
    });

    it('should call next if md file type', function () {
        var req = {
            url: 'README.md'
        };

        staticTheme(null)(req, null, next);
        next.called.should.be.true;
    });

    it('should call next if json file type', function () {
        var req = {
            url: 'sample.json'
        };

        staticTheme(null)(req, null, next);
        next.called.should.be.true;
    });

    it('should call express.static if valid file type', function (done) {
        var req = {
                url: 'myvalidfile.css',
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
            next.called.should.be.false;
            activeThemeStub.called.should.be.true;
            expressStatic.called.should.be.true;
            expressStatic.args[0][1].maxAge.should.exist;
            done();
        });
    });
});
