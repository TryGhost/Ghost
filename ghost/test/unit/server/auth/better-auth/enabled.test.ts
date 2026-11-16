import assert from 'node:assert/strict';

// require, not import: config-utils and enabled must share one CommonJS config instance
const configUtils = require('../../../../utils/config-utils');
const enabled: typeof import('../../../../../core/server/auth/better-auth/enabled') = require('../../../../../core/server/auth/better-auth/enabled');

describe('usesBetterAuth', function () {
  afterEach(async function () {
    await configUtils.restore();
  });

  it('is true with auth:betterAuthDev and the in-development tables', function () {
    configUtils.set({ createInDevelopmentTables: true, 'auth:betterAuthDev': true });

    assert.equal(enabled.usesBetterAuth(), true);
  });

  it('is false with only the in-development tables', function () {
    configUtils.set({ createInDevelopmentTables: true, 'auth:betterAuthDev': false });

    assert.equal(enabled.usesBetterAuth(), false);
  });

  it('is false without either', function () {
    configUtils.set({ createInDevelopmentTables: false, 'auth:betterAuthDev': false });

    assert.equal(enabled.usesBetterAuth(), false);
  });

  it('refuses auth:betterAuthDev without the in-development tables', function () {
    configUtils.set({ createInDevelopmentTables: false, 'auth:betterAuthDev': true });

    assert.throws(() => enabled.usesBetterAuth(), {
      name: 'IncorrectUsageError',
      message: /auth:betterAuthDev requires the in-development auth tables/,
    });
  });
});
