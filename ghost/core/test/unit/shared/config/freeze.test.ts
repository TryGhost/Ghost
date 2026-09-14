import assert from 'node:assert/strict';
import Nconf from 'nconf';
import { bindFreeze, type ConfigFreeze } from '../../../../core/shared/config/freeze';

type TestConfig = Nconf.Provider & ConfigFreeze;

interface BuildConfigOptions {
  overrides?: Record<string, unknown>;
  env?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
}

/**
 * Build a provider with the same store *shape* Ghost's loader produces - a
 * writable store on top, then higher-priority read-only sources, then the
 * config files - so the tests exercise the same resolution order as production.
 */
function buildConfig({
  overrides = {},
  env = {},
  defaults = {},
}: BuildConfigOptions = {}): TestConfig {
  const nconf = new Nconf.Provider();

  nconf.add('overrides', { type: 'literal', store: overrides });
  // a literal store is read-only, so give the chain something writable on top
  nconf.stores.overrides.readOnly = false;
  nconf.add('env', { type: 'literal', store: env });
  nconf.add('defaults', { type: 'literal', store: defaults });

  bindFreeze(nconf);

  return nconf;
}

/**
 * Reach into a store to change it behind the cache's back, so a test can prove
 * a cached read never consults it again.
 */
function pokeStore(config: TestConfig, storeName: string, key: string, value: unknown): void {
  (config.stores[storeName].store as Record<string, unknown>)[key] = value;
}

describe('Unit: shared/config/freeze', function () {
  describe('get caching', function () {
    it('returns the same values before and after freezing', function () {
      const config = buildConfig({
        defaults: {
          url: 'http://localhost:2368',
          database: { client: 'sqlite3', connection: { filename: 'db.sqlite' } },
          paths: { contentPath: '/content' },
        },
      });

      const keys = ['url', 'database', 'database:client', 'database:connection:filename', 'paths'];
      const before = keys.map((key) => config.get(key));

      config.freeze();

      assert.deepEqual(
        keys.map((key) => config.get(key)),
        before,
      );
    });

    it('serves repeated lookups from the cache', function () {
      const config = buildConfig({ defaults: { url: 'http://localhost:2368' } });
      config.freeze();

      // prime the cache, then change the underlying store - a cached read must
      // not consult it again
      assert.equal(config.get('url'), 'http://localhost:2368');
      pokeStore(config, 'defaults', 'url', 'http://changed-underneath');

      assert.equal(config.get('url'), 'http://localhost:2368');
    });

    it('caches misses as well as hits', function () {
      const config = buildConfig({ defaults: {} });
      config.freeze();

      assert.equal(config.get('nope'), undefined);

      // a miss that was cached stays a miss even once the store gains the key
      pokeStore(config, 'defaults', 'nope', 'now set');

      assert.equal(config.get('nope'), undefined);
    });

    it('does not cache a keyless get', function () {
      const config = buildConfig({ defaults: { url: 'http://localhost:2368' } });
      config.freeze();

      assert.deepEqual(config.get(), { url: 'http://localhost:2368' });

      pokeStore(config, 'defaults', 'url', 'http://changed-underneath');

      assert.deepEqual(config.get(), { url: 'http://changed-underneath' });
    });

    it('resolves nested keys through the store chain while frozen', function () {
      const config = buildConfig({
        env: { database: { connection: { password: 'sekrit' } } },
        defaults: { database: { client: 'sqlite3', connection: { filename: 'db.sqlite' } } },
      });
      config.freeze();

      assert.equal(config.get('database:connection:password'), 'sekrit');
      assert.equal(config.get('database:connection:filename'), 'db.sqlite');
      assert.deepEqual(config.get('database:connection'), {
        password: 'sekrit',
        filename: 'db.sqlite',
      });
    });

    it('drops the cache when unfrozen', function () {
      const config = buildConfig({ defaults: { url: 'http://localhost:2368' } });
      config.freeze();

      assert.equal(config.get('url'), 'http://localhost:2368');

      config.unfreeze();
      config.set('url', 'http://new-url');

      assert.equal(config.get('url'), 'http://new-url');
    });

    it('does not cache while unfrozen', function () {
      const config = buildConfig({ defaults: { url: 'http://localhost:2368' } });

      assert.equal(config.get('url'), 'http://localhost:2368');

      config.set('url', 'http://new-url');

      assert.equal(config.get('url'), 'http://new-url');
    });
  });

  describe('cached objects are immutable', function () {
    it('rejects mutation of an object handed back by get', function () {
      const config = buildConfig({
        defaults: { database: { client: 'sqlite3', connection: { filename: 'db.sqlite' } } },
      });
      config.freeze();

      const database = config.get('database') as Record<string, unknown>;

      assert.throws(() => {
        database.pool = { min: 1 };
      }, TypeError);
      assert.throws(() => {
        (database.connection as Record<string, unknown>).timezone = 'Z';
      }, TypeError);
    });

    it('keeps a parent read and a nested read in agreement', function () {
      const config = buildConfig({
        defaults: { database: { client: 'sqlite3', connection: { filename: 'db.sqlite' } } },
      });
      config.freeze();

      const database = config.get('database') as Record<string, unknown>;

      // a caller that tries to bolt something on must not be able to make
      // get('database').pool and get('database:pool') disagree
      try {
        database.pool = { min: 1 };
      } catch {
        // expected - the point is what the two reads say afterwards
      }

      assert.equal((config.get('database') as Record<string, unknown>).pool, undefined);
      assert.equal(config.get('database:pool'), undefined);
    });
  });

  describe('isFrozen', function () {
    it('reports the freeze state', function () {
      const config = buildConfig();

      assert.equal(config.isFrozen(), false);

      config.freeze();
      assert.equal(config.isFrozen(), true);

      config.unfreeze();
      assert.equal(config.isFrozen(), false);
    });
  });

  describe('mutation', function () {
    it('allows writes before freezing', function () {
      const config = buildConfig();

      config.set('some:key', 'value');

      assert.equal(config.get('some:key'), 'value');
    });

    it('throws on every mutating method once frozen', function () {
      const methods: Record<string, unknown[]> = {
        set: ['a', 'b'],
        clear: ['a'],
        merge: [{ a: 'b' }],
        reset: [],
        load: [],
        add: ['another', { type: 'literal', store: {} }],
        remove: ['defaults'],
        file: ['some', '/tmp/nope.json'],
        use: ['defaults', { type: 'literal', store: {} }],
      };

      for (const [method, args] of Object.entries(methods)) {
        const config = buildConfig({ defaults: { a: 'b' } });
        config.freeze();

        assert.throws(
          () =>
            (config as unknown as Record<string, (...a: unknown[]) => unknown>)[method](...args),
          /Config is frozen and cannot be changed/,
          `expected ${method}() to throw while frozen`,
        );
      }
    });

    it('still validates required keys while frozen', function () {
      // required() sits alongside the mutators on the provider but only reads -
      // it calls get() per key and throws when one is missing
      const config = buildConfig({ defaults: { url: 'http://localhost:2368' } });
      config.freeze();

      assert.equal(config.required(['url']), true);
      assert.throws(() => config.required(['url', 'nope']), /Missing required keys: nope/);
    });

    it('names the key that was written in the error', function () {
      const config = buildConfig();
      config.freeze();

      assert.throws(() => config.set('database:client', 'mysql2'), /set\('database:client'\)/);
    });

    it('allows writes again after unfreezing', function () {
      const config = buildConfig();
      config.freeze();
      config.unfreeze();

      config.set('some:key', 'value');

      assert.equal(config.get('some:key'), 'value');
    });

    it('leaves config unchanged when a frozen write is caught', function () {
      const config = buildConfig({ defaults: { url: 'http://localhost:2368' } });
      config.freeze();

      assert.throws(() => config.set('url', 'http://new-url'));
      assert.equal(config.get('url'), 'http://localhost:2368');
    });
  });
});
