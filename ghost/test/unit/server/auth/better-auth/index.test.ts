import assert from 'node:assert/strict';
import sinon from 'sinon';

const configUtils = require('../../../../utils/config-utils');
const settingsCache = require('../../../../../core/shared/settings-cache');

const rootPath = require.resolve('../../../../../core/server/auth/better-auth');
type Root = typeof import('../../../../../core/server/auth/better-auth').default;

describe('Better Auth', function () {
  let cachedRoot: NodeJS.Module | undefined;

  /** A fresh module, so the started instance doesn't outlive this file in the shared unit worker */
  function loadRoot(): Root {
    delete require.cache[rootPath];
    return require(rootPath).default;
  }

  beforeEach(function () {
    cachedRoot = require.cache[rootPath];
    configUtils.set('database:client', 'mysql2');
  });

  afterEach(async function () {
    delete require.cache[rootPath];
    if (cachedRoot) {
      require.cache[rootPath] = cachedRoot;
    }
    sinon.restore();
    await configUtils.restore();
  });

  it('refuses to hand out an instance before it is started', function () {
    const betterAuth = loadRoot();

    assert.throws(() => betterAuth.instance, { message: /used before start\(\)/ });
  });

  it('fails start when Better Auth setup fails, and can retry', async function () {
    const betterAuth = loadRoot();
    // Better Auth rejects an empty secret during its deferred setup
    const get = sinon.stub(settingsCache, 'get').withArgs('admin_session_secret').returns('');

    await assert.rejects(betterAuth.start(), { message: /Empty secret value/ });
    assert.throws(() => betterAuth.instance, { message: /used before start\(\)/ });

    get.returns('a'.repeat(64));
    await betterAuth.start();
    assert.equal(typeof betterAuth.instance.handler, 'function');
  });

  it('builds one instance, shared by overlapping and later starts', async function () {
    const betterAuth = loadRoot();
    sinon.stub(settingsCache, 'get').withArgs('admin_session_secret').returns('a'.repeat(64));

    await Promise.all([betterAuth.start(), betterAuth.start()]);
    const { instance } = betterAuth;
    await betterAuth.start();

    assert.equal(betterAuth.instance, instance);
  });
});
