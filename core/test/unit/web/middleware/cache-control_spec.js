var should = require('should'),
    sinon = require('sinon'),
    cacheControl = require('../../../../server/web/middleware/cache-control'),

    sandbox = sinon.sandbox.create();

describe('Middleware: cacheControl', function () {
    var res;

    beforeEach(function () {
        res = {
            set: sandbox.spy()
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('correctly sets the public profile headers', function (done) {
        cacheControl('public')(null, res, function (a) {
            should.not.exist(a);
            res.set.calledOnce.should.be.true();
            res.set.calledWith({'Cache-Control': 'public, max-age=0'});
            done();
        });
    });

    it('correctly sets the private profile headers', function (done) {
        cacheControl('private')(null, res, function (a) {
            should.not.exist(a);
            res.set.calledOnce.should.be.true();
            res.set.calledWith({
                'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
            });
            done();
        });
    });

    it('will not set headers without a profile', function (done) {
        cacheControl()(null, res, function (a) {
            should.not.exist(a);
            res.set.called.should.be.false();
            done();
        });
    });

    it('will not get confused between serving public and private', function (done) {
        var publicCC = cacheControl('public'),
            privateCC = cacheControl('private');

        publicCC(null, res, function () {
            res.set.calledOnce.should.be.true();
            res.set.calledWith({'Cache-Control': 'public, max-age=0'});

            privateCC(null, res, function () {
                res.set.calledTwice.should.be.true();
                res.set.calledWith({
                    'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
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
        cacheControl('public')(null, res, function (a) {
            should.not.exist(a);
            res.set.calledOnce.should.be.true();
            res.set.calledWith({
                'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
            });
            done();
        });
    });
});
