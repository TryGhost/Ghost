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

    it('calls the cache and attempts to render, even without data', async function () {
        rssCacheStub.returns(Promise.resolve('dummyxml'));

        await renderer.render(res, baseUrl);
        sinon.assert.calledOnce(rssCacheStub);
        assert.deepEqual(rssCacheStub.firstCall.args, ['/rss/', {}]);

        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, 'Content-Type', 'application/rss+xml; charset=UTF-8');

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWith(res.send, 'dummyxml');
    });

    it('correctly merges locals into empty data before rendering', async function () {
        rssCacheStub.returns(Promise.resolve('dummyxml'));

        res.locals = {foo: 'bar'};

        await renderer.render(res, baseUrl);
        sinon.assert.calledOnce(rssCacheStub);
        assert.deepEqual(rssCacheStub.firstCall.args, ['/rss/', {foo: 'bar'}]);

        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, 'Content-Type', 'application/rss+xml; charset=UTF-8');

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWith(res.send, 'dummyxml');
    });

    it('correctly merges locals into non-empty data before rendering', async function () {
        rssCacheStub.returns(Promise.resolve('dummyxml'));

        res.locals = {foo: 'bar'};
        const data = {foo: 'baz', fizz: 'buzz'};

        await renderer.render(res, baseUrl, data);
        sinon.assert.calledOnce(rssCacheStub);
        assert.deepEqual(rssCacheStub.firstCall.args, ['/rss/', {foo: 'baz', fizz: 'buzz'}]);

        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, 'Content-Type', 'application/rss+xml; charset=UTF-8');

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWith(res.send, 'dummyxml');
    });

    it('does nothing if it gets an error', async function () {
        rssCacheStub.returns(Promise.reject(new Error('Fake Error')));

        await assert.rejects(() => renderer.render(res, baseUrl), {
            message: 'Fake Error'
        });

        sinon.assert.calledOnce(rssCacheStub);
        assert.deepEqual(rssCacheStub.firstCall.args, ['/rss/', {}]);

        sinon.assert.notCalled(res.set);
        sinon.assert.notCalled(res.send);
    });
});
