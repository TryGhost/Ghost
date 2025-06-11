const should = require('should');
const sinon = require('sinon');

const cacheControl = require('../../../../../../core/server/web/shared/middleware/cache-control');

describe('Cache-Control middleware', function () {
    let res;

    beforeEach(function () {
        res = {
            set: sinon.spy()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('correctly sets the public profile headers', function (done) {
        cacheControl('public')(null, res, function (a) {
            should.not.exist(a);
            res.set.calledOnce.should.be.true();
            res.set.calledWith({'Cache-Control': 'public, max-age=0'}).should.be.true();
            done();
        });
    });

    it('correctly sets the public profile headers with custom maxAge', function (done) {
        cacheControl('public', {maxAge: 123456})(null, res, function (a) {
            should.not.exist(a);
            res.set.calledOnce.should.be.true();
            res.set.calledWith({'Cache-Control': 'public, max-age=123456'}).should.be.true();
            done();
        });
    });

    it('correctly sets the public profile headers with staleWhileRevalidate', function (done) {
        cacheControl('public', {maxAge: 1, staleWhileRevalidate: 9})(null, res, function (a) {
            should.not.exist(a);
            res.set.calledOnce.should.be.true();
            res.set.calledWith({'Cache-Control': 'public, max-age=1, stale-while-revalidate=9'}).should.be.true();
            done();
        });
    });

    it('correctly sets the private profile headers', function (done) {
        cacheControl('private')(null, res, function (a) {
            should.not.exist(a);
            res.set.calledOnce.should.be.true();
            res.set.calledWith({
                'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
            }).should.be.true();
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
        const publicCC = cacheControl('public');
        const privateCC = cacheControl('private');

        publicCC(null, res, function () {
            res.set.calledOnce.should.be.true();
            res.set.calledWith({'Cache-Control': 'public, max-age=0'}).should.be.true();

            privateCC(null, res, function () {
                res.set.calledTwice.should.be.true();
                res.set.calledWith({
                    'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                }).should.be.true();

                publicCC(null, res, function () {
                    res.set.calledThrice.should.be.true();
                    res.set.calledWith({'Cache-Control': 'public, max-age=0'});

                    privateCC(null, res, function () {
                        res.set.calledWith({
                            'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                        }).should.be.true();
                        done();
                    });
                });
            });
        });
    });
});
