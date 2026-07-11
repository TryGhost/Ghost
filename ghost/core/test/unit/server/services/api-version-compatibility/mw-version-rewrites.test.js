const sinon = require('sinon');
const {deferred} = require('../../../../utils/deferred')
const assert = require('node:assert/strict');

const mwVersionRewrites = require('../../../../../core/server/services/api-version-compatibility/mw-version-rewrites');
const configUtils = require('../../../../utils/config-utils');

describe('MW Version Rewrites', function () {
    let req, res;

    beforeEach(function () {
        configUtils.set({
            url: 'https://mysite.com',
            admin: {
                url: 'https://admin.mysite.com'
            }
        });

        req = {
            headers: {}
        };

        res = {
            header: sinon.stub()
        };
    });

    afterEach(async function () {
        sinon.restore();
        // beforeEach overrides the site/admin URL config; restore it so the
        // override can't leak into a co-scheduled file under the shared module
        // registry (isolate: false).
        await configUtils.restore();
    });

    function assertVersionRewrittenWithHeaders(version, path, done) {
        mwVersionRewrites(req, res, (err) => {
            assert.deepEqual(req.headers, {'accept-version': `${version}.0`}, 'accept version header was set on req');
            sinon.assert.calledTwice(res.header);
            sinon.assert.calledWithExactly(res.header.firstCall, 'Deprecation', `version="${version}"`);
            sinon.assert.calledWithExactly(res.header.secondCall, 'Link', `<https://admin.mysite.com/ghost/api${path}>; rel="latest-version"`);
            done(err);
        });
    }

    it('does nothing for standard admin urls', function () {
        const {promise, done} = deferred();
        req.url = '/admin/';

        mwVersionRewrites(req, res, (err) => {
            assert.deepEqual(req.headers, {}, 'accept version header was NOT set on req');
            sinon.assert.notCalled(res.header);
            done(err);
        });
        return promise;
    });

    it('does nothing for standard content urls', function () {
        const {promise, done} = deferred();
        req.url = '/content/';

        mwVersionRewrites(req, res, (err) => {
            assert.deepEqual(req.headers, {}, 'accept version header was NOT set on req');
            sinon.assert.notCalled(res.header);
            done(err);
        });
        return promise;
    });

    it('rewrites a legacy v2 admin url', function () {
        const {promise, done} = deferred();
        req.url = '/v2/admin/session/';

        assertVersionRewrittenWithHeaders('v2', '/admin/session/', done);
        return promise;
    });

    it('rewrites a legacy v2 content url', function () {
        const {promise, done} = deferred();
        req.url = '/v2/content/posts/?key=xxx';

        assertVersionRewrittenWithHeaders('v2', '/content/posts/?key=xxx', done);
        return promise;
    });

    it('rewrites a legacy v3 admin url', function () {
        const {promise, done} = deferred();
        req.url = '/v3/admin/session/';

        assertVersionRewrittenWithHeaders('v3', '/admin/session/', done);
        return promise;
    });

    it('rewrites a legacy v3 content url', function () {
        const {promise, done} = deferred();
        req.url = '/v3/content/posts/?key=xxx';

        assertVersionRewrittenWithHeaders('v3', '/content/posts/?key=xxx', done);
        return promise;
    });

    it('rewrites a legacy v4 admin url', function () {
        const {promise, done} = deferred();
        req.url = '/v4/admin/session/';

        assertVersionRewrittenWithHeaders('v4', '/admin/session/', done);
        return promise;
    });

    it('rewrites a legacy v4 content url', function () {
        const {promise, done} = deferred();
        req.url = '/v4/content/posts/?key=xxx';

        assertVersionRewrittenWithHeaders('v4', '/content/posts/?key=xxx', done);
        return promise;
    });

    it('rewrites a legacy canary admin url as if it were v4', function () {
        const {promise, done} = deferred();
        req.url = '/canary/admin/session/';

        assertVersionRewrittenWithHeaders('v4', '/admin/session/', done);
        return promise;
    });

    it('rewrites a legacy canary content url as if it were v4', function () {
        const {promise, done} = deferred();
        req.url = '/canary/content/posts/?key=xxx';

        assertVersionRewrittenWithHeaders('v4', '/content/posts/?key=xxx', done);
        return promise;
    });
});
