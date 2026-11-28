import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sinon from 'sinon';

const settingsCache = require('../../../../../core/shared/settings-cache');
const labs = require('../../../../../core/shared/labs');
const db = require('../../../../../core/server/data/db');

const rootPath = require.resolve('../../../../../core/server/auth/better-auth');
type Root = typeof import('../../../../../core/server/auth/better-auth').default;

// The root's first load in a worker brings in Better Auth: hundreds of modules, which tsx
// compiles as they are required. That takes seconds on a cold cache, so it happens here, as the
// file is imported, where no timeout applies. Inside a test it used most of that test's 5s
require('../../../../../core/server/auth/better-auth/create-auth');

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

  /** Initialises a fresh root with the apps flag as given, and returns its plugins' ids */
  async function initWithApps(apps: boolean) {
    const betterAuth = loadRoot();
    sinon
      .stub(settingsCache, 'get')
      .withArgs('admin_session_secret')
      .returns(randomBytes(32).toString('hex'));
    sinon.stub(labs, 'isSet').withArgs('apps').returns(apps);
    const raw = sinon.spy(db.knex, 'raw');
    await betterAuth.init();
    return { plugins: betterAuth.service.options.plugins?.map((plugin) => plugin.id) ?? [], raw };
  }

  it('registers the provider and jwt plugins with the apps flag on, without reading the database', async function () {
    const { plugins, raw } = await initWithApps(true);

    assert.ok(plugins.includes('oauth-provider'));
    assert.ok(plugins.includes('jwt'));
    sinon.assert.notCalled(raw);
  });

  it("doesn't register them with the apps flag off", async function () {
    const { plugins } = await initWithApps(false);

    assert.ok(!plugins.includes('oauth-provider'));
    assert.ok(!plugins.includes('jwt'));
  });
});
