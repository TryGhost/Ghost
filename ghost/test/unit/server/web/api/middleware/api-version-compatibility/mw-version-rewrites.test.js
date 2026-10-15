const sinon = require('sinon');
const assert = require('node:assert/strict');

const mwVersionRewrites = require('../../../../../../../core/server/web/api/middleware/api-version-compatibility/mw-version-rewrites');
const configUtils = require('../../../../../../utils/config-utils');

describe('MW Version Rewrites', function () {
  let req, res;

  beforeEach(function () {
    configUtils.set({
      url: 'https://mysite.com',
      admin: {
        url: 'https://admin.mysite.com',
      },
    });

    req = {
      headers: {},
    };

    res = {
      header: sinon.stub(),
    };
  });

  afterEach(async function () {
    sinon.restore();
    // beforeEach overrides the site/admin URL config; restore it so the
    // override can't leak into a co-scheduled file under the shared module
    // registry (isolate: false).
    await configUtils.restore();
  });

  function assertVersionRewrittenWithHeaders(version, path, resolve, reject) {
    mwVersionRewrites(req, res, (err) => {
      assert.deepEqual(
        req.headers,
        { 'accept-version': `${version}.0` },
        'accept version header was set on req',
      );
      sinon.assert.calledTwice(res.header);
      sinon.assert.calledWithExactly(res.header.firstCall, 'Deprecation', `version="${version}"`);
      sinon.assert.calledWithExactly(
        res.header.secondCall,
        'Link',
        `<https://admin.mysite.com/ghost/api${path}>; rel="latest-version"`,
      );
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  }

  it('does nothing for standard admin urls', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/admin/';

    mwVersionRewrites(req, res, (err) => {
      assert.deepEqual(req.headers, {}, 'accept version header was NOT set on req');
      sinon.assert.notCalled(res.header);
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
    return promise;
  });

  it('does nothing for standard content urls', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/content/';

    mwVersionRewrites(req, res, (err) => {
      assert.deepEqual(req.headers, {}, 'accept version header was NOT set on req');
      sinon.assert.notCalled(res.header);
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
    return promise;
  });

  it('rewrites a legacy v2 admin url', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/v2/admin/session/';

    assertVersionRewrittenWithHeaders('v2', '/admin/session/', resolve, reject);
    return promise;
  });

  it('rewrites a legacy v2 content url', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/v2/content/posts/?key=xxx';

    assertVersionRewrittenWithHeaders('v2', '/content/posts/?key=xxx', resolve, reject);
    return promise;
  });

  it('rewrites a legacy v3 admin url', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/v3/admin/session/';

    assertVersionRewrittenWithHeaders('v3', '/admin/session/', resolve, reject);
    return promise;
  });

  it('rewrites a legacy v3 content url', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/v3/content/posts/?key=xxx';

    assertVersionRewrittenWithHeaders('v3', '/content/posts/?key=xxx', resolve, reject);
    return promise;
  });

  it('rewrites a legacy v4 admin url', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/v4/admin/session/';

    assertVersionRewrittenWithHeaders('v4', '/admin/session/', resolve, reject);
    return promise;
  });

  it('rewrites a legacy v4 content url', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/v4/content/posts/?key=xxx';

    assertVersionRewrittenWithHeaders('v4', '/content/posts/?key=xxx', resolve, reject);
    return promise;
  });

  it('rewrites a legacy canary admin url as if it were v4', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/canary/admin/session/';

    assertVersionRewrittenWithHeaders('v4', '/admin/session/', resolve, reject);
    return promise;
  });

  it('rewrites a legacy canary content url as if it were v4', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/canary/content/posts/?key=xxx';

    assertVersionRewrittenWithHeaders('v4', '/content/posts/?key=xxx', resolve, reject);
    return promise;
  });

  it('rewrites a legacy versioned api root without a trailing slash', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/v4/admin';

    assertVersionRewrittenWithHeaders('v4', '/admin', resolve, reject);
    return promise;
  });

  it('rewrites a legacy url whatever the case of its version', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/V4/admin/posts/';

    assertVersionRewrittenWithHeaders('v4', '/admin/posts/', resolve, reject);
    return promise;
  });

  it('rewrites a legacy url whatever the case of its api name', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/v4/Admin/posts/';

    assertVersionRewrittenWithHeaders('v4', '/Admin/posts/', resolve, reject);
    return promise;
  });

  it('rewrites a legacy canary url in capitals as if it were v4', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/CANARY/CONTENT/posts/?key=xxx';

    assertVersionRewrittenWithHeaders('v4', '/CONTENT/posts/?key=xxx', resolve, reject);
    return promise;
  });

  it('rewrites only the leading version of a legacy url', function () {
    const { promise, resolve, reject } = Promise.withResolvers();
    req.url = '/v4/admin/posts/v4/?filter=tag:v4/';

    assertVersionRewrittenWithHeaders('v4', '/admin/posts/v4/?filter=tag:v4/', resolve, reject);
    return promise;
  });

  describe('urls that only contain a version outside the leading segment', function () {
    function assertNotRewritten(url) {
      const { promise, resolve, reject } = Promise.withResolvers();
      req.url = url;

      mwVersionRewrites(req, res, (err) => {
        try {
          assert.equal(req.url, url, 'url was NOT rewritten');
          assert.deepEqual(req.headers, {}, 'accept version header was NOT set on req');
          sinon.assert.notCalled(res.header);
        } catch (assertionError) {
          return reject(assertionError);
        }
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
      return promise;
    }

    it('ignores a versioned api path in the query string', function () {
      return assertNotRewritten('/admin/db/?x=ghost/api/v4/admin/');
    });

    it('ignores a version later in the path', function () {
      return assertNotRewritten('/admin/v4/db/?x=ghost/api/v4/admin/');
    });

    it('ignores a version suffix inside a path segment', function () {
      return assertNotRewritten('/admin/dbv4//?x=ghost/api/v4/admin/');
    });

    it('ignores a versioned api path nested later in the path', function () {
      return assertNotRewritten('/admin/db/ghost/api/v4/admin/');
    });

    it('ignores a version segment that is not followed by an api name', function () {
      return assertNotRewritten('/v4/db/?x=/admin/');
    });
  });
});
