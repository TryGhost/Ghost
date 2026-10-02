import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import _ from 'lodash';
import Nconf from 'nconf';
import sinon from 'sinon';
import { z } from 'zod';
import { configSchema, schemafiedPaths } from '../../../../core/shared/config/schema';
import {
  attachValidatedConfig,
  deepFreeze,
  validateConfig,
  type WithValidatedConfig,
} from '../../../../core/shared/config/validated';

const configDir = path.join(__dirname, '../../../../core/shared/config');

function readJson(...parts: string[]): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(configDir, ...parts), 'utf8'));
}

type TestConfig = Nconf.Provider & WithValidatedConfig;

function providerWith(store: Record<string, unknown>): Nconf.Provider {
  // a memory store, not a literal one: literal stores are read-only, and these
  // tests need the writes that config-utils performs in the real suite
  const nconf = new Nconf.Provider();
  nconf.use('test', { type: 'memory' });

  for (const [key, value] of Object.entries(store)) {
    nconf.set(key, value);
  }

  return nconf;
}

function attach(store: Record<string, unknown>): TestConfig {
  const nconf = providerWith(store);
  attachValidatedConfig(nconf);
  return nconf;
}

const minimal = { env: 'testing', url: 'http://localhost:2368' };

describe('Config Schema', function () {
  it('covers the key paths it types', function () {
    assert.deepEqual([...schemafiedPaths()].sort(), ['env', 'url']);
  });

  describe('parsing the config Ghost ships', function () {
    const defaults = readJson('defaults.json');
    const overrides = readJson('overrides.json');
    const envFiles = fs.readdirSync(path.join(configDir, 'env')).filter((f) => f.endsWith('.json'));

    // Anything this rejects or rewrites is config a running Ghost already has.
    // Adding a key to the schema only ever adds validation, never transformation.
    envFiles.forEach(function (file) {
      it(`accepts env/${file} without changing it`, function () {
        const merged = _.merge({}, defaults, readJson('env', file), overrides, {
          env: 'testing',
        });

        const result = configSchema.safeParse(merged);

        assert.ok(result.success, result.success ? '' : z.prettifyError(result.error));
        assert.deepEqual(result.data, merged);
      });
    });

    it('keeps keys that have no schema yet', function () {
      const parsed = configSchema.parse({ ...minimal, somethingProInjects: { nested: true } });

      assert.deepEqual(parsed.somethingProInjects, { nested: true });
    });
  });

  describe('url', function () {
    it('requires a protocol, matching the long-standing boot check', function () {
      assert.ok(configSchema.safeParse({ env: 'testing', url: 'my-ghost-blog.com' }).error);
      assert.ok(
        configSchema.safeParse({ env: 'testing', url: 'http://my-ghost-blog.com' }).success,
      );
    });
  });
});

describe('Validated Config', function () {
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

  describe('validateConfig', function () {
    it('returns a deep-frozen view', function () {
      const validated = validateConfig(providerWith({ ...minimal, paths: { contentPath: '/a' } }));

      assert.ok(Object.isFrozen(validated));
      assert.ok(Object.isFrozen(validated.paths));
    });

    it('does not freeze the nconf store it read from', function () {
      const nconf = providerWith({ ...minimal, paths: { contentPath: '/a' } });
      validateConfig(nconf);

      nconf.set('paths:contentPath', '/b');

      assert.equal(nconf.get('paths:contentPath'), '/b');
    });

    it('throws outside production when the config is invalid', function () {
      assert.throws(
        () => validateConfig(providerWith({ env: 'testing', url: 'no-protocol' })),
        /Ghost config failed validation/,
      );
    });

    it('throws for testing-mysql too, matching isTestEnv()', function () {
      assert.throws(() => validateConfig(providerWith({ env: 'testing-mysql', url: 'nope' })));
    });

    // a live site's boot must not depend on this repo having got the schema
    // right, and an embedder picks its own NODE_ENV
    ['production', 'staging', 'whatever-an-embedder-picked'].forEach(function (env) {
      it(`warns instead of throwing in ${env}`, function () {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        const validated = validateConfig(providerWith({ env, url: 'no-protocol' }));

        assert.equal(validated.url, 'no-protocol');
        assert.match(error.mock.calls[0][0] as string, /not enforced/);
        error.mockRestore();
      });
    });

    it('is forced strict by GHOST_CONFIG_SCHEMA_STRICT', function () {
      vi.stubEnv('GHOST_CONFIG_SCHEMA_STRICT', 'true');

      assert.throws(() => validateConfig(providerWith({ env: 'staging', url: 'no-protocol' })));

      vi.unstubAllEnvs();
    });

    it('is forced lenient by GHOST_CONFIG_SCHEMA_STRICT', function () {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubEnv('GHOST_CONFIG_SCHEMA_STRICT', 'false');

      assert.equal(
        validateConfig(providerWith({ env: 'development', url: 'no-protocol' })).url,
        'no-protocol',
      );

      vi.unstubAllEnvs();
      error.mockRestore();
    });
  });

  describe('get()', function () {
    it('serves a schemafied key from the frozen view', function () {
      const config = attach(minimal);

      assert.equal(config.get('url'), 'http://localhost:2368');
      assert.equal(config.get('url'), config.validated.url);
    });

    it('leaves a key with no schema on nconf, unfrozen', function () {
      const store = { ...minimal, paths: { contentPath: '/a' } };
      const config = attach(store);

      // unschemafied keys are untouched, so nothing reading them today can be
      // affected by the frozen view
      assert.deepEqual(config.get('paths'), providerWith(store).get('paths'));
      assert.ok(!Object.isFrozen(config.get('paths')));
    });

    it('falls back to nconf for a path the schema misses', function () {
      const store = { ...minimal, paths: { contentPath: '/a' } };
      const config = attach(store);

      assert.equal(config.get('url:nope'), undefined);
      assert.deepEqual(config.get(), providerWith(store).get());
    });

    it('re-validates after a write through nconf', function () {
      const config = attach(minimal);

      config.set('url', 'http://elsewhere.test');

      assert.equal(config.get('url'), 'http://elsewhere.test');
    });

    it('re-validates after a reset', function () {
      const config = attach(minimal);

      config.reset();
      config.set('env', 'testing');
      config.set('url', 'http://rebuilt.test');

      // nothing re-validates part-way through, so the briefly incomplete config
      // in the middle of a restore is never rejected
      assert.equal(config.get('url'), 'http://rebuilt.test');
    });

    it('can still be stubbed', function () {
      const config = attach(minimal);
      const stub = sinon.stub(config, 'get').returns('stubbed');

      assert.equal(config.get('url'), 'stubbed');

      stub.restore();
      assert.equal(config.get('url'), 'http://localhost:2368');
    });
  });
});
