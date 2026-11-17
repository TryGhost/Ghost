import assert from 'node:assert/strict';
import sinon from 'sinon';

const configUtils = require('../../../../utils/config-utils');
const settingsCache = require('../../../../../core/shared/settings-cache');

const rootPath = require.resolve('../../../../../core/server/auth/better-auth');
type Root = typeof import('../../../../../core/server/auth/better-auth').default;

describe('Better Auth service root', function () {
  let cachedRoot: NodeJS.Module | undefined;

  /** A fresh root, so the ready instance doesn't outlive this file in the shared unit worker */
  function loadRoot(): Root {
    delete require.cache[rootPath];
    return require(rootPath).default;
  }

  beforeEach(function () {
    cachedRoot = require.cache[rootPath];
    configUtils.set('database:client', 'mysql2');
    configUtils.set('createInDevelopmentTables', true);
  });

  afterEach(async function () {
    delete require.cache[rootPath];
    if (cachedRoot) {
      require.cache[rootPath] = cachedRoot;
    }
    sinon.restore();
    await configUtils.restore();
  });

  it('fails init when Better Auth setup fails, and can retry', async function () {
    const betterAuth = loadRoot();
    // Better Auth rejects an empty secret during its deferred setup
    const get = sinon.stub(settingsCache, 'get').withArgs('admin_session_secret').returns('');

    await assert.rejects(betterAuth.init(), { message: /Empty secret value/ });
    assert.throws(() => betterAuth.service, { message: /used before init\(\)/ });

    get.returns('a'.repeat(64));
    await betterAuth.init();
    assert.equal(typeof betterAuth.service.handler, 'function');
  });
});
