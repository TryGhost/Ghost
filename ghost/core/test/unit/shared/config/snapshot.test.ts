import assert from 'node:assert/strict';
import Nconf from 'nconf';
import { deepFreeze } from '../../../../core/shared/config/freeze';
import {
  REFRESH_SNAPSHOT,
  attachAccessors,
  createSnapshot,
} from '../../../../core/shared/config/snapshot';
import { configSchema } from '../../../../core/shared/config/schema';

type TestConfig = Nconf.Provider & {
  [key: string]: any;
  [REFRESH_SNAPSHOT]: () => void;
};

function providerWith(store: Record<string, unknown>): TestConfig {
  // a memory store, not a literal one: literal stores are read-only, and these
  // tests need the writes that config-utils performs in the real suite
  const nconf = new Nconf.Provider();
  nconf.use('test', { type: 'memory' });

  for (const [key, value] of Object.entries(store)) {
    nconf.set(key, value);
  }

  return nconf as TestConfig;
}

function attach(store: Record<string, unknown>): TestConfig {
  const nconf = providerWith(store);
  attachAccessors(nconf, createSnapshot(nconf));
  return nconf;
}

const minimal = { env: 'testing', url: 'http://localhost:2368' };

describe('Config Snapshot', function () {
  describe('deepFreeze', function () {
    it('freezes nested objects and arrays', function () {
      const frozen = deepFreeze({ a: { b: [{ c: 1 }] } });

      assert.ok(Object.isFrozen(frozen.a));
      assert.ok(Object.isFrozen(frozen.a.b));
      assert.ok(Object.isFrozen(frozen.a.b[0]));
    });

    it('tolerates cycles', function () {
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;

      assert.ok(Object.isFrozen(deepFreeze(cyclic)));
    });
  });

  describe('createSnapshot', function () {
    it('returns a deep-frozen view', function () {
      const snapshot = createSnapshot(providerWith({ ...minimal, paths: { contentPath: '/a' } }));

      assert.ok(Object.isFrozen(snapshot));
      assert.ok(Object.isFrozen(snapshot.paths));
    });

    it('does not freeze the nconf store it read from', function () {
      const nconf = providerWith({ ...minimal, paths: { contentPath: '/a' } });
      createSnapshot(nconf);

      nconf.set('paths:contentPath', '/b');

      assert.equal(nconf.get('paths:contentPath'), '/b');
    });

    it('throws outside production when the config is invalid', function () {
      assert.throws(
        () => createSnapshot(providerWith({ env: 'testing', url: 'no-protocol' })),
        /Ghost config failed validation/,
      );
    });

    it('warns instead of throwing in production', function () {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      const snapshot = createSnapshot(providerWith({ env: 'production', url: 'no-protocol' }));

      assert.equal(snapshot.url, 'no-protocol');
      assert.match(error.mock.calls[0][0] as string, /not enforced in production yet/);
      error.mockRestore();
    });

    it('is forced strict by GHOST_CONFIG_SCHEMA_STRICT', function () {
      vi.stubEnv('GHOST_CONFIG_SCHEMA_STRICT', 'true');

      assert.throws(() => createSnapshot(providerWith({ env: 'production', url: 'no-protocol' })));

      vi.unstubAllEnvs();
    });
  });

  describe('attachAccessors', function () {
    it('reads the same values as nconf', function () {
      const config = attach({ ...minimal, paths: { contentPath: '/a' } });

      assert.equal(config.url, config.get('url'));
      assert.deepEqual(config.paths, config.get('paths'));
    });

    it('shadows nconf#env with the config key of the same name', function () {
      assert.equal(attach(minimal).env, 'testing');
    });

    it('hands out frozen values', function () {
      const config = attach({ ...minimal, paths: { contentPath: '/a' } });

      assert.ok(Object.isFrozen(config.paths));
    });

    it('keeps serving the old snapshot until it is refreshed', function () {
      const config = attach({ ...minimal, paths: { contentPath: '/a' } });

      config.set('paths:contentPath', '/b');
      assert.equal(config.paths.contentPath, '/a');

      (config[REFRESH_SNAPSHOT] as () => void)();
      assert.equal(config.paths.contentPath, '/b');
    });

    it('never shadows an nconf method Ghost calls', function () {
      const keys = Object.keys(configSchema.def.shape);

      // `env` is the deliberate exception - see the RESERVED note in snapshot.ts
      assert.deepEqual(
        keys.filter((key) => ['get', 'set', 'reset'].includes(key)),
        [],
      );
    });
  });
});
