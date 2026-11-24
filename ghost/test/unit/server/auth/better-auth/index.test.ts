import assert from 'node:assert/strict';
import sinon from 'sinon';

const settingsCache = require('../../../../../core/shared/settings-cache');
const labs = require('../../../../../core/shared/labs');
const db = require('../../../../../core/server/data/db');

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
  });

  afterEach(function () {
    delete require.cache[rootPath];
    if (cachedRoot) {
      require.cache[rootPath] = cachedRoot;
    }
    sinon.restore();
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

  it("doesn't look for the app tables while the apps flag is off", async function () {
    const betterAuth = loadRoot();
    sinon.stub(settingsCache, 'get').withArgs('admin_session_secret').returns('a'.repeat(64));
    sinon.stub(labs, 'isSet').withArgs('apps').returns(false);
    const raw = sinon.spy(db.knex, 'raw');

    await betterAuth.init();

    sinon.assert.neverCalledWithMatch(raw, sinon.match(/show full tables|sqlite_master/));
  });
});
