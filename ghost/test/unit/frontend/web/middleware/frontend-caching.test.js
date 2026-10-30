const assert = require('node:assert').strict;
const express = require('express');
const request = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const configUtils = require('../../../../utils/config-utils');

const { api } = require('../../../../../core/frontend/services/proxy');
const frontendCaching = require('../../../../../core/frontend/web/middleware/frontend-caching');

const cacheMembersContentConfigKey = 'cacheMembersContent:enabled';

describe('frontendCaching', function () {
  let freeTier;
  let premiumTier;

  beforeEach(async function () {
    freeTier = { id: 'freeTierId' };
    premiumTier = { id: 'premiumTierId' };
  });

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
  });

  async function requestWithFrontendCaching({
    path = '/',
    member,
    isPrivateBlog,
    previewHeader,
    staffFrontendToolsEnabled,
    staffFrontendToolsCookieUpdated,
    // Null uses the middleware's own loader, which reads the tiers.
    loadFreeTier = async () => freeTier,
  } = {}) {
    const app = express();
    const middleware = await frontendCaching.getMiddleware(loadFreeTier ?? undefined);

    app.use((req, res, next) => {
      req.member = member;
      res.isPrivateBlog = isPrivateBlog;
      res.locals.staffFrontendToolsEnabled = staffFrontendToolsEnabled;
      res.locals.staffFrontendToolsCookieUpdated = staffFrontendToolsCookieUpdated;
      if (staffFrontendToolsCookieUpdated) {
        res.set('Cache-Control', 'no-store');
      }
      next();
    });
    app.use(middleware);
    app.use((req, res) => {
      res.sendStatus(204);
    });

    const frontendRequest = request(app).get(path);

    if (previewHeader) {
      frontendRequest.set('x-ghost-preview', previewHeader);
    }

    return frontendRequest.expect(204);
  }

  it('should set cache control to private if the blog is private', async function () {
    const { headers } = await requestWithFrontendCaching({ isPrivateBlog: true });
    assert.equal(headers['cache-control'], testUtils.cacheRules.private);
  });

  it('should set cache control to private if the request is made by a member', async function () {
    const { headers } = await requestWithFrontendCaching({ member: true });
    assert.equal(headers['cache-control'], testUtils.cacheRules.private);
  });

  it('should set cache control to public if the site is public and the request is not made by a member', async function () {
    const { headers } = await requestWithFrontendCaching();
    assert.equal(headers['cache-control'], testUtils.cacheRules.public);
  });

  it('reads the free tier only for a member with no subscription whose content can be cached', async function () {
    const browse = sinon.stub(api.tiers, 'browse').resolves({
      tiers: [
        { id: 'paidTierId', type: 'paid' },
        { id: 'freeTierId', type: 'free' },
      ],
    });
    configUtils.set(cacheMembersContentConfigKey, true);

    await requestWithFrontendCaching({ loadFreeTier: null });
    assert.equal(browse.called, false);

    await requestWithFrontendCaching({
      member: { subscriptions: [{ status: 'active', tier: premiumTier }] },
      loadFreeTier: null,
    });
    assert.equal(browse.called, false);

    const { headers } = await requestWithFrontendCaching({
      member: { subscriptions: [] },
      loadFreeTier: null,
    });
    assert.equal(browse.calledOnce, true);
    assert.equal(headers['x-member-cache-tier'], 'freeTierId');
  });

  it("keeps a member's page out of shared caches when the free tier can't be read", async function () {
    configUtils.set(cacheMembersContentConfigKey, true);

    const { headers } = await requestWithFrontendCaching({
      member: { subscriptions: [] },
      loadFreeTier: async () => {
        throw new Error('The database is unavailable');
      },
    });
    assert.equal(headers['cache-control'], testUtils.cacheRules.private);
    assert.equal(headers['x-member-cache-tier'], undefined);
  });

  it('should set cache control to private if the admin toolbar is enabled', async function () {
    const { headers } = await requestWithFrontendCaching({ staffFrontendToolsEnabled: true });
    assert.equal(headers['cache-control'], testUtils.cacheRules.private);
  });

  it('should preserve cache control when the admin toolbar marker cookie is updated', async function () {
    const { headers } = await requestWithFrontendCaching({ staffFrontendToolsCookieUpdated: true });
    assert.equal(headers['cache-control'], 'no-store');
  });

  it('should set cache control to public if the request is made by a member and caching members content is enabled', async function () {
    configUtils.set(cacheMembersContentConfigKey, true);

    const { headers } = await requestWithFrontendCaching({
      member: {
        subscriptions: [],
      },
    });
    assert.equal(headers['cache-control'], testUtils.cacheRules.public);
    assert.equal(headers['x-member-cache-tier'], 'freeTierId');
  });

  it('should set cache control to no-cache if the path starts with /p/', async function () {
    const { headers } = await requestWithFrontendCaching({ path: '/p/test' });
    assert.equal(headers['cache-control'], testUtils.cacheRules.noCache);
  });

  it('should set cache control to private if the member has more than one active subscription', async function () {
    configUtils.set(cacheMembersContentConfigKey, true);

    const { headers } = await requestWithFrontendCaching({
      member: {
        subscriptions: [{ status: 'active' }, { status: 'active' }],
      },
    });
    assert.equal(headers['cache-control'], testUtils.cacheRules.private);
    assert.equal(headers['x-member-cache-tier'], undefined);
  });

  it('should set cache control to public for the member tier if the member has one active subscription', async function () {
    configUtils.set(cacheMembersContentConfigKey, true);

    const { headers } = await requestWithFrontendCaching({
      member: {
        subscriptions: [{ status: 'active', tier: premiumTier }],
      },
    });
    assert.equal(headers['cache-control'], testUtils.cacheRules.public);
    assert.equal(headers['x-member-cache-tier'], 'premiumTierId');
  });

  it('should set cache control to public for the free tier if the member has no active subscriptions', async function () {
    configUtils.set(cacheMembersContentConfigKey, true);

    const { headers } = await requestWithFrontendCaching({
      member: {
        subscriptions: [],
      },
    });
    assert.equal(headers['cache-control'], testUtils.cacheRules.public);
    assert.equal(headers['x-member-cache-tier'], 'freeTierId');
  });

  it('should set cache control to no-cache if the request includes preview data', async function () {
    const { headers } = await requestWithFrontendCaching({ previewHeader: 'c=%23ff0000' });
    assert.equal(headers['cache-control'], testUtils.cacheRules.noCache);
  });
});
