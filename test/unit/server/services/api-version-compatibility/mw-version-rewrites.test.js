const sinon = require('sinon');
const assert = require('assert');

const mwVersionRewrites = require('../../../../../core/server/services/api-version-compatibility/mw-version-rewrites');
const configUtils = require('../../../../utils/configUtils');

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

    afterEach(function () {
        sinon.restore();
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

    it('does nothing for standard admin urls', function (done) {
        req.url = '/admin/';

        mwVersionRewrites(req, res, (err) => {
            assert.deepEqual(req.headers, {}, 'accept version header was NOT set on req');
            sinon.assert.notCalled(res.header);
            done(err);
        });
    });

    it('does nothing for standard content urls', function (done) {
        req.url = '/content/';

        mwVersionRewrites(req, res, (err) => {
            assert.deepEqual(req.headers, {}, 'accept version header was NOT set on req');
            sinon.assert.notCalled(res.header);
            done(err);
        });
    });

    it('rewrites a legacy v2 admin url', function (done) {
        req.url = '/v2/admin/session/';

        assertVersionRewrittenWithHeaders('v2', '/admin/session/', done);
    });

    it('rewrites a legacy v2 content url', function (done) {
        req.url = '/v2/content/posts/?key=xxx';

        assertVersionRewrittenWithHeaders('v2', '/content/posts/?key=xxx', done);
    });

    it('rewrites a legacy v3 admin url', function (done) {
        req.url = '/v3/admin/session/';

        assertVersionRewrittenWithHeaders('v3', '/admin/session/', done);
    });

    it('rewrites a legacy v3 content url', function (done) {
        req.url = '/v3/content/posts/?key=xxx';

        assertVersionRewrittenWithHeaders('v3', '/content/posts/?key=xxx', done);
    });

    it('rewrites a legacy v4 admin url', function (done) {
        req.url = '/v4/admin/session/';

        assertVersionRewrittenWithHeaders('v4', '/admin/session/', done);
    });

    it('rewrites a legacy v4 content url', function (done) {
        req.url = '/v4/content/posts/?key=xxx';

        assertVersionRewrittenWithHeaders('v4', '/content/posts/?key=xxx', done);
    });

    it('rewrites a legacy canary admin url as if it were v4', function (done) {
        req.url = '/canary/admin/session/';

        assertVersionRewrittenWithHeaders('v4', '/admin/session/', done);
    });

    it('rewrites a legacy canary content url as if it were v4', function (done) {
        req.url = '/canary/content/posts/?key=xxx';

        assertVersionRewrittenWithHeaders('v4', '/content/posts/?key=xxx', done);
    });
});
