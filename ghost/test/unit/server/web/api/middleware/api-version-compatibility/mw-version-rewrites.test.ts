import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import type * as mwVersionRewrites from '../../../../../../../core/server/web/api/middleware/api-version-compatibility/mw-version-rewrites';

// The middleware reads the config singleton that config-utils mutates, so both
// have to come from the same `require` graph (see local-images-storage.test.ts).
const {
  versionRewrites,
}: typeof mwVersionRewrites = require('../../../../../../../core/server/web/api/middleware/api-version-compatibility/mw-version-rewrites');
const configUtils = require('../../../../../../utils/config-utils');

const app = () => {
  const result = express();

  result.use(versionRewrites);

  result.use((req, res) => {
    res.json({ url: req.url, acceptVersion: req.headers['accept-version'] ?? null });
  });

  return result;
};

const expectUnchanged = async (url: string) => {
  const res = await request(app()).get(url).expect(200);

  assert.deepEqual(res.body, { url, acceptVersion: null });
  assert.equal(res.headers.deprecation, undefined);
  assert.equal(res.headers.link, undefined);
};

const expectRewritten = async (url: string, version: string, versionlessUrl: string) => {
  const res = await request(app()).get(url).expect(200);

  assert.deepEqual(res.body, { url: versionlessUrl, acceptVersion: `${version}.0` });
  assert.equal(res.headers.deprecation, `version="${version}"`);
  assert.equal(
    res.headers.link,
    `<https://admin.mysite.com/ghost/api${versionlessUrl}>; rel="latest-version"`,
  );
};

describe('MW Version Rewrites', function () {
  beforeEach(function () {
    configUtils.set({
      url: 'https://mysite.com',
      admin: {
        url: 'https://admin.mysite.com',
      },
    });
  });

  afterEach(async function () {
    // beforeEach overrides the site/admin URL config; restore it so the
    // override can't leak into a co-scheduled file under the shared module
    // registry (isolate: false).
    await configUtils.restore();
  });

  it('does nothing for standard admin urls', async function () {
    await expectUnchanged('/admin/');
  });

  it('does nothing for standard content urls', async function () {
    await expectUnchanged('/content/');
  });

  for (const version of ['v2', 'v3', 'v4']) {
    it(`rewrites a legacy ${version} admin url`, async function () {
      await expectRewritten(`/${version}/admin/session/`, version, '/admin/session/');
    });

    it(`rewrites a legacy ${version} content url`, async function () {
      await expectRewritten(
        `/${version}/content/posts/?key=xxx`,
        version,
        '/content/posts/?key=xxx',
      );
    });
  }

  it('rewrites a legacy canary admin url as if it were v4', async function () {
    await expectRewritten('/canary/admin/session/', 'v4', '/admin/session/');
  });

  it('rewrites a legacy canary content url as if it were v4', async function () {
    await expectRewritten('/canary/content/posts/?key=xxx', 'v4', '/content/posts/?key=xxx');
  });

  it('keeps an accept-version header the client already sent', async function () {
    const res = await request(app())
      .get('/v3/admin/session/')
      .set('Accept-Version', 'v5.0')
      .expect(200);

    assert.equal(res.body.acceptVersion, 'v5.0');
    assert.equal(res.headers.deprecation, 'version="v3"');
  });
});
