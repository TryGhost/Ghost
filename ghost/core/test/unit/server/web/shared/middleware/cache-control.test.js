const assert = require('node:assert/strict');
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

    it('correctly sets the public profile headers', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            cacheControl('public')(null, res, function (a) {
                assert(!a);
                sinon.assert.calledOnce(res.set);
                sinon.assert.calledWith(res.set, {'Cache-Control': 'public, max-age=0'});
                done();
            });
        });
    });

    it('correctly sets the public profile headers with custom maxAge', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            cacheControl('public', {maxAge: 123456})(null, res, function (a) {
                assert(!a);
                sinon.assert.calledOnce(res.set);
                sinon.assert.calledWith(res.set, {'Cache-Control': 'public, max-age=123456'});
                done();
            });
        });
    });

    it('correctly sets the public profile headers with staleWhileRevalidate', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            cacheControl('public', {maxAge: 1, staleWhileRevalidate: 9})(null, res, function (a) {
                assert(!a);
                sinon.assert.calledOnce(res.set);
                sinon.assert.calledWith(res.set, {'Cache-Control': 'public, max-age=1, stale-while-revalidate=9'});
                done();
            });
        });
    });

    it('correctly sets the private profile headers', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            cacheControl('private')(null, res, function (a) {
                assert(!a);
                sinon.assert.calledOnce(res.set);
                sinon.assert.calledWith(res.set, {
                    'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                });
                done();
            });
        });
    });

    it('correctly sets the noCache profile headers', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            cacheControl('noCache')(null, res, function (a) {
                assert(!a);
                sinon.assert.calledOnce(res.set);
                sinon.assert.calledWith(res.set, {'Cache-Control': 'no-cache, max-age=0, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'});
                done();
            });
        });
    });

    it('will not set headers without a profile', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            cacheControl()(null, res, function (a) {
                assert(!a);
                sinon.assert.notCalled(res.set);
                done();
            });
        });
    });

    it('will not get confused between serving public and private', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            const publicCC = cacheControl('public');
            const privateCC = cacheControl('private');

            publicCC(null, res, function () {
                sinon.assert.calledOnce(res.set);
                sinon.assert.calledWith(res.set, {'Cache-Control': 'public, max-age=0'});

                privateCC(null, res, function () {
                    sinon.assert.calledTwice(res.set);
                    sinon.assert.calledWith(res.set, {
                        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                    });

                    publicCC(null, res, function () {
                        sinon.assert.calledThrice(res.set);
                        sinon.assert.calledWith(res.set, {'Cache-Control': 'public, max-age=0'});

                        privateCC(null, res, function () {
                            sinon.assert.calledWith(res.set, {
                                'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                            });
                            done();
                        });
                    });
                });
            });
        });
    });
});
