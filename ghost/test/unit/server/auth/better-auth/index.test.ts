import assert from 'node:assert/strict';
import sinon from 'sinon';

const configUtils = require('../../../../utils/config-utils');
const settingsCache = require('../../../../../core/shared/settings-cache');
const {
  openServices,
  services,
}: typeof import('../../../../utils/services') = require('../../../../utils/services');

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
  });

  afterEach(async function () {
    delete require.cache[rootPath];
    if (cachedRoot) {
      require.cache[rootPath] = cachedRoot;
    }
    await services.close();
    sinon.restore();
    await configUtils.restore();
  });

  it('refuses to be built before Ghost has started', async function () {
    const betterAuth = loadRoot();

    assert.throws(() => betterAuth.service, {
      message: /^Better Auth was used while Ghost is not started/,
    });
    await assert.rejects(services.resolve(betterAuth), {
      message: /^Better Auth was used while Ghost is not started/,
    });
  });

  it('fails its build when Better Auth setup fails, and can be built again', async function () {
    const betterAuth = loadRoot();
    // Better Auth rejects an empty secret during its deferred setup
    const get = sinon.stub(settingsCache, 'get').withArgs('admin_session_secret').returns('');
    openServices();

    // What boot does with the list entry: it waits for the build.
    await assert.rejects(services.start(betterAuth), { message: /Empty secret value/ });

    get.returns('a'.repeat(64));
    // It is built asynchronously, so a read that cannot wait is told so until the build has finished.
    assert.throws(() => betterAuth.service, {
      message: /is built asynchronously and is not ready/,
    });
    await services.resolve(betterAuth);
    assert.equal(typeof betterAuth.service.handler, 'function');
    assert.equal(betterAuth.service, await services.resolve(betterAuth));
  });
});
