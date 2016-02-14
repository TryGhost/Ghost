/*globals describe, beforeEach, afterEach, it*/
var should          = require('should'),
    sinon           = require('sinon'),
    middleware      = require('../../../server/middleware').middleware;

describe('Middleware: cacheControl', function () {
    var sandbox,
        res;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        res = {
            set: sinon.spy()
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('correctly sets the public profile headers', function (done) {
        middleware.cacheControl('public')(null, res, function (a) {
            should.not.exist(a);
            res.set.calledOnce.should.be.true();
            res.set.calledWith({'Cache-Control': 'public, max-age=0'});
            done();
        });
    });

    it('correctly sets the private profile headers', function (done) {
        middleware.cacheControl('private')(null, res, function (a) {
            should.not.exist(a);
            res.set.calledOnce.should.be.true();
            res.set.calledWith({
                'Cache-Control':
                    'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
            });
            done();
        });
    });

    it('will not set headers without a profile', function (done) {
        middleware.cacheControl()(null, res, function (a) {
            should.not.exist(a);
            res.set.called.should.be.false();
            done();
        });
    });

    it('will not get confused between serving public and private', function (done) {
        var publicCC = middleware.cacheControl('public'),
            privateCC = middleware.cacheControl('private');

        publicCC(null, res, function () {
            res.set.calledOnce.should.be.true();
            res.set.calledWith({'Cache-Control': 'public, max-age=0'});

            privateCC(null, res, function () {
                res.set.calledTwice.should.be.true();
                res.set.calledWith({
                    'Cache-Control':
                        'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                });

                publicCC(null, res, function () {
                    res.set.calledThrice.should.be.true();
                    res.set.calledWith({'Cache-Control': 'public, max-age=0'});

                    privateCC(null, res, function () {
                        res.set.calledWith({
                            'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                        });
                        done();
                    });
                });
            });
        });
    });

    it('will override public with private for private blogs', function (done) {
        res.isPrivateBlog = true;
        middleware.cacheControl('public')(null, res, function (a) {
            should.not.exist(a);
            res.set.calledOnce.should.be.true();
            res.set.calledWith({
                'Cache-Control':
                    'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
            });
            done();
        });
    });
});
