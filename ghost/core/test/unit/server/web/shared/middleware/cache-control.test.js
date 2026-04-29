const sinon = require('sinon');

const cacheControl = require('../../../../../../core/server/web/shared/middleware/cache-control');

describe('Cache-Control middleware', function () {
    let res;

    const runMiddleware = async function (middleware) {
        await new Promise((resolve, reject) => {
            middleware(null, res, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };

    beforeEach(function () {
        res = {
            set: sinon.spy()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('correctly sets the public profile headers', async function () {
        await runMiddleware(cacheControl('public'));

        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, {'Cache-Control': 'public, max-age=0'});
    });

    it('correctly sets the public profile headers with custom maxAge', async function () {
        await runMiddleware(cacheControl('public', {maxAge: 123456}));

        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, {'Cache-Control': 'public, max-age=123456'});
    });

    it('correctly sets the public profile headers with staleWhileRevalidate', async function () {
        await runMiddleware(cacheControl('public', {maxAge: 1, staleWhileRevalidate: 9}));

        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, {'Cache-Control': 'public, max-age=1, stale-while-revalidate=9'});
    });

    it('correctly sets the private profile headers', async function () {
        await runMiddleware(cacheControl('private'));

        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, {
            'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
        });
    });

    it('correctly sets the noCache profile headers', async function () {
        await runMiddleware(cacheControl('noCache'));

        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set, {'Cache-Control': 'no-cache, max-age=0, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'});
    });

    it('will not set headers without a profile', async function () {
        await runMiddleware(cacheControl());

        sinon.assert.notCalled(res.set);
    });

    it('will not get confused between serving public and private', async function () {
        const publicCC = cacheControl('public');
        const privateCC = cacheControl('private');

        await runMiddleware(publicCC);
        sinon.assert.calledOnce(res.set);
        sinon.assert.calledWith(res.set.getCall(0), {'Cache-Control': 'public, max-age=0'});

        await runMiddleware(privateCC);
        sinon.assert.calledTwice(res.set);
        sinon.assert.calledWith(res.set.getCall(1), {
            'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
        });

        await runMiddleware(publicCC);
        sinon.assert.calledThrice(res.set);
        sinon.assert.calledWith(res.set.getCall(2), {'Cache-Control': 'public, max-age=0'});

        await runMiddleware(privateCC);
        sinon.assert.callCount(res.set, 4);
        sinon.assert.calledWith(res.set.getCall(3), {
            'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
        });
    });
});
