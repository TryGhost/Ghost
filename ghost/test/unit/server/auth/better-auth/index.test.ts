import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sinon from 'sinon';
import { APP_OAUTH_TABLES } from '../../../../../core/server/auth/better-auth/plugins/apps';

const settingsCache = require('../../../../../core/shared/settings-cache');
const labs = require('../../../../../core/shared/labs');
const db = require('../../../../../core/server/data/db');
const logging = require('@tryghost/logging');

const rootPath = require.resolve('../../../../../core/server/auth/better-auth');
type Root = typeof import('../../../../../core/server/auth/better-auth').default;

// The first start in a worker builds Better Auth cold, which takes 1.5–3s in CI and more on a
// slow runner. The shuffled order decides which test here pays for it.
describe('Better Auth', { timeout: 15_000 }, function () {
  let cachedRoot: NodeJS.Module | undefined;

  /** A fresh module, so the started instance doesn't outlive this file in the shared unit worker */
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

  it("doesn't look for the app tables while the apps flag is off", async function () {
    const betterAuth = loadRoot();
    sinon.stub(settingsCache, 'get').withArgs('admin_session_secret').returns('a'.repeat(64));
    sinon.stub(labs, 'isSet').withArgs('apps').returns(false);
    const raw = sinon.spy(db.knex, 'raw');

    await betterAuth.init();

    sinon.assert.neverCalledWithMatch(raw, sinon.match(/show full tables|sqlite_master/));
  });

  describe('with the apps flag on', function () {
    /** Answers the table listing with the given tables, on either database */
    function listTables(tables: string[]) {
      const raw = db.knex.raw.bind(db.knex);
      sinon.stub(db.knex, 'raw').callsFake((sql: unknown, ...args: unknown[]) => {
        if (/show full tables/.test(String(sql))) {
          return Promise.resolve([tables.map((name) => ({ name }))]);
        }
        if (/sqlite_master/.test(String(sql))) {
          return Promise.resolve(tables.map((name) => ({ tbl_name: name })));
        }
        return raw(sql, ...args);
      });
    }

    async function initWith(tables: string[]) {
      const betterAuth = loadRoot();
      sinon
        .stub(settingsCache, 'get')
        .withArgs('admin_session_secret')
        .returns(randomBytes(32).toString('hex'));
      sinon.stub(labs, 'isSet').withArgs('apps').returns(true);
      listTables(tables);
      await betterAuth.init();
      return betterAuth.service.options.plugins?.map((plugin) => plugin.id) ?? [];
    }

    it('registers the provider when every app table exists', async function () {
      const warn = sinon.stub(logging, 'warn');

      const plugins = await initWith([...APP_OAUTH_TABLES]);

      assert.ok(plugins.includes('oauth-provider'));
      sinon.assert.notCalled(warn);
    });

    it("doesn't register the provider with an app table missing, and says which", async function () {
      const warn = sinon.stub(logging, 'warn');
      const [missing, ...present] = APP_OAUTH_TABLES;

      const plugins = await initWith(present);

      assert.ok(!plugins.includes('oauth-provider'));
      assert.ok(!plugins.includes('jwt'));
      sinon.assert.calledOnceWithMatch(warn, sinon.match(missing!));
    });
  });
});
