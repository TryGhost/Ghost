/*globals describe, it, beforeEach */
/*jshint expr:true*/
var sinon        = require('sinon'),
    should       = require('should'),
    Promise      = require('bluebird'),

    api          = require('../../../server/api'),
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
                url: 'myvalidfile.css'
            },
            settingsStub,
            sandbox = sinon.sandbox.create(),
            expressStatic = sinon.spy(express, 'static');

        settingsStub = sandbox.stub(api.settings, 'read').withArgs(sinon.match.has('key', 'activeTheme')).returns(Promise.resolve({
            settings: [{
                key: 'activeKey',
                value: 'casper'
            }]
        }));

        staticTheme(null)(req, null, function (reqArg, res, next2) {
            /*jshint unused:false */
            sandbox.restore();
            next.called.should.be.false;
            expressStatic.called.should.be.true;
            expressStatic.args[0][1].maxAge.should.exist;
            done();
        });
    });
});
