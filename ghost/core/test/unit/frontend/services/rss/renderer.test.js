const assert = require('node:assert/strict');
const sinon = require('sinon');
const rssCache = require('../../../../../core/frontend/services/rss/cache');
const renderer = require('../../../../../core/frontend/services/rss/renderer');

describe('RSS: Renderer', function () {
    let rssCacheStub;
    let res;
    let baseUrl;

    beforeEach(function () {
        rssCacheStub = sinon.stub(rssCache, 'getXML');

        res = {
            locals: {},
            set: sinon.stub(),
            send: sinon.spy()
        };

        baseUrl = '/rss/';
    });

    afterEach(function () {
        sinon.restore();
    });

    it('calls the cache and attempts to render, even without data', function (done) {
        rssCacheStub.returns(Promise.resolve('dummyxml'));

        renderer.render(res, baseUrl).then(function () {
            assert.equal(rssCacheStub.calledOnce, true);
            assert.deepEqual(rssCacheStub.firstCall.args, ['/rss/', {}]);

            assert.equal(res.set.calledOnce, true);
            assert.equal(res.set.calledWith('Content-Type', 'application/rss+xml; charset=UTF-8'), true);

            assert.equal(res.send.calledOnce, true);
            assert.equal(res.send.calledWith('dummyxml'), true);

            done();
        }).catch(done);
    });

    it('correctly merges locals into empty data before rendering', function (done) {
        rssCacheStub.returns(Promise.resolve('dummyxml'));

        res.locals = {foo: 'bar'};

        renderer.render(res, baseUrl).then(function () {
            assert.equal(rssCacheStub.calledOnce, true);
            assert.deepEqual(rssCacheStub.firstCall.args, ['/rss/', {foo: 'bar'}]);

            assert.equal(res.set.calledOnce, true);
            assert.equal(res.set.calledWith('Content-Type', 'application/rss+xml; charset=UTF-8'), true);

            assert.equal(res.send.calledOnce, true);
            assert.equal(res.send.calledWith('dummyxml'), true);

            done();
        }).catch(done);
    });

    it('correctly merges locals into non-empty data before rendering', function (done) {
        rssCacheStub.returns(Promise.resolve('dummyxml'));

        res.locals = {foo: 'bar'};
        const data = {foo: 'baz', fizz: 'buzz'};

        renderer.render(res, baseUrl, data).then(function () {
            assert.equal(rssCacheStub.calledOnce, true);
            assert.deepEqual(rssCacheStub.firstCall.args, ['/rss/', {foo: 'baz', fizz: 'buzz'}]);

            assert.equal(res.set.calledOnce, true);
            assert.equal(res.set.calledWith('Content-Type', 'application/rss+xml; charset=UTF-8'), true);

            assert.equal(res.send.calledOnce, true);
            assert.equal(res.send.calledWith('dummyxml'), true);

            done();
        }).catch(done);
    });

    it('does nothing if it gets an error', function (done) {
        rssCacheStub.returns(Promise.reject(new Error('Fake Error')));

        renderer.render(res, baseUrl).then(function () {
            done('This should have errored');
        }).catch(function (err) {
            assert.equal(err.message, 'Fake Error');

            assert.equal(rssCacheStub.calledOnce, true);
            assert.deepEqual(rssCacheStub.firstCall.args, ['/rss/', {}]);

            assert.equal(res.set.called, false);
            assert.equal(res.send.called, false);

            done();
        });
    });
});
