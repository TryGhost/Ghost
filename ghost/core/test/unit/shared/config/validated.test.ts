import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import _ from 'lodash';
import { z } from 'zod';
import { configSchema } from '../../../../core/shared/config/schema';
import { createConfig, deepFreeze, validateConfig } from '../../../../core/shared/config/validated';

const sloppy = require('../../../utils/fixtures/sloppy-config-writer');

const configDir = path.join(__dirname, '../../../../core/shared/config');

function readJson(...parts: string[]): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(configDir, ...parts), 'utf8'));
}

const minimal = { env: 'testing', url: 'http://localhost:2368' };

describe('Config Schema', function () {
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

        const result = configSchema.safeParse(_.cloneDeep(merged));

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
    // in hooks, so a failing assertion can't leave GHOST_CONFIG_SCHEMA_STRICT
    // set or console.error mocked for every later test
    afterEach(function () {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it('refuses writes, by throwing under the guard', function () {
      // stubbed rather than inherited: the guard is on by default under test,
      // but a developer may have GHOST_CONFIG_GUARD exported - see ./guard.test.ts
      vi.stubEnv('GHOST_CONFIG_GUARD', 'true');

      const validated = validateConfig({ ...minimal, paths: { contentPath: '/a' } });

      assert.throws(() => sloppy.write(validated.paths, 'contentPath', '/b'), /read-only/);
    });

    it('deep-freezes instead where the guard is off, as production does', function () {
      vi.stubEnv('GHOST_CONFIG_GUARD', 'false');

      const validated = validateConfig({ ...minimal, paths: { contentPath: '/a' } });

      assert.ok(Object.isFrozen(validated));
      assert.ok(Object.isFrozen(validated.paths));
    });

    it('throws outside production when the config is invalid', function () {
      assert.throws(
        () => validateConfig({ env: 'testing', url: 'no-protocol' }),
        /Ghost config failed validation/,
      );
    });

    it('throws for testing-mysql too, matching isTestEnv()', function () {
      assert.throws(() => validateConfig({ env: 'testing-mysql', url: 'nope' }));
    });

    // a live site's boot must not depend on this repo having got the schema
    // right, and an embedder picks its own NODE_ENV
    ['production', 'staging', 'whatever-an-embedder-picked'].forEach(function (env) {
      it(`warns instead of throwing in ${env}`, function () {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        const validated = validateConfig({ env, url: 'no-protocol' });

        assert.equal(validated.url, 'no-protocol');
        assert.match(error.mock.calls[0][0] as string, /not enforced/);
      });
    });

    it('is forced strict by GHOST_CONFIG_SCHEMA_STRICT', function () {
      vi.stubEnv('GHOST_CONFIG_SCHEMA_STRICT', 'true');

      assert.throws(() => validateConfig({ env: 'staging', url: 'no-protocol' }));
    });

    it('is forced lenient by GHOST_CONFIG_SCHEMA_STRICT', function () {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubEnv('GHOST_CONFIG_SCHEMA_STRICT', 'false');

      assert.equal(validateConfig({ env: 'development', url: 'no-protocol' }).url, 'no-protocol');
    });
  });

  describe('createConfig', function () {
    afterEach(function () {
      vi.unstubAllEnvs();
    });

    it('reads key paths out of the frozen tree', function () {
      const config = createConfig({ ...minimal, paths: { contentPath: '/a' } });

      assert.equal(config.get('url'), 'http://localhost:2368');
      assert.equal(config.get('paths:contentPath'), '/a');
      assert.deepEqual(config.get('paths'), { contentPath: '/a' });
    });

    it('makes every key read-only, not only the ones with a schema', function () {
      vi.stubEnv('GHOST_CONFIG_GUARD', 'true');

      const config = createConfig({ ...minimal, paths: { contentPath: '/a' } });

      // the schema is loose, so an unlisted key is validated and protected too -
      // that is what makes the whole config immutable
      assert.throws(() => sloppy.write(config.get('paths'), 'contentPath', '/b'), /read-only/);
      assert.throws(() => sloppy.write(config.get(), 'url', 'http://nope.test'), /read-only/);
    });

    it('returns undefined for a path that is not there', function () {
      const config = createConfig(minimal);

      assert.equal(config.get('nope'), undefined);
      assert.equal(config.get('url:nope'), undefined);
    });

    it('does not freeze the sources it was handed', function () {
      const sources = { ...minimal, paths: { contentPath: '/a' } };

      createConfig(sources);
      sources.paths.contentPath = '/b';

      assert.equal(sources.paths.contentPath, '/b');
    });

    it('rebuilds atomically on set, so config is never half-written', function () {
      const config = createConfig(minimal);

      config.set('url', 'http://elsewhere.test');

      assert.equal(config.get('url'), 'http://elsewhere.test');
      assert.equal(config.getSiteUrl(), 'http://elsewhere.test/');
    });

    it('keeps earlier overrides when a later one is set', function () {
      const config = createConfig({ ...minimal, paths: { contentPath: '/a' } });

      config.set('paths:contentPath', '/b');
      config.set('url', 'http://elsewhere.test');

      assert.equal(config.get('paths:contentPath'), '/b');
      assert.equal(config.get('url'), 'http://elsewhere.test');
    });

    it('does not freeze the value it was handed', function () {
      const config = createConfig(minimal);
      const value = { active: 'local-storage' };

      config.set('storage', value);
      value.active = 'changed-after-the-fact';

      assert.equal(value.active, 'changed-after-the-fact');
      assert.equal(config.get('storage:active'), 'local-storage');
    });

    it('forgets an override that failed validation', function () {
      const config = createConfig(minimal);

      assert.throws(() => config.set('url', 'no-protocol'));

      // the rejected value must not linger, or this would throw too
      config.set('paths', { contentPath: '/a' });

      assert.equal(config.get('url'), 'http://localhost:2368');
      assert.equal(config.get('paths:contentPath'), '/a');
    });

    it('replays overrides in write order, so the latest wins', function () {
      const config = createConfig({ ...minimal, paths: { contentPath: '/base' } });

      // a Map keeps an existing key's original position on set, which would let
      // the first write of `paths:contentPath` replay before `paths` and lose
      config.set('paths:contentPath', '/first');
      config.set('paths', { contentPath: '/second' });
      config.set('paths:contentPath', '/last');

      assert.equal(config.get('paths:contentPath'), '/last');
    });

    it('lets a parent override replace a child written earlier', function () {
      const config = createConfig({ ...minimal, paths: { contentPath: '/base' } });

      config.set('paths:contentPath', '/first');
      config.set('paths', { contentPath: '/second' });

      assert.equal(config.get('paths:contentPath'), '/second');
    });

    it('keeps write order when a rejected override is rolled back', function () {
      const config = createConfig({ ...minimal, paths: { contentPath: '/base' } });

      config.set('paths:contentPath', '/first');
      config.set('paths', { contentPath: '/second' });
      config.set('paths:contentPath', '/last');

      assert.throws(() => config.set('url', 'no-protocol'));

      assert.equal(config.get('paths:contentPath'), '/last');
    });

    it('keeps earlier overrides when the value cannot be cloned', function () {
      const config = createConfig({ ...minimal, paths: { contentPath: '/base' } });
      config.set('paths:contentPath', '/kept');

      // cloneDeep throws on this; nothing may be recorded or dropped before it
      const unclonable = Object.defineProperty({}, 'x', {
        get() {
          throw new Error('boom');
        },
        enumerable: true,
      });

      assert.throws(() => config.set('paths:contentPath', unclonable), /boom/);
      assert.equal(config.get('paths:contentPath'), '/kept');

      // the override has to survive the next rebuild too
      config.set('url', 'http://elsewhere.test');
      assert.equal(config.get('paths:contentPath'), '/kept');
    });

    it('drops every override on reset', function () {
      const config = createConfig(minimal);
      config.set('url', 'http://elsewhere.test');

      config.reset();

      assert.equal(config.get('url'), 'http://localhost:2368');
    });

    it('binds the url and content-path helpers', function () {
      const config = createConfig({ ...minimal, paths: { contentPath: '/a/' } });

      assert.equal(config.getSiteUrl(), 'http://localhost:2368/');
      assert.equal(config.getContentPath('images'), '/a/images/');
      assert.ok(config.isTestEnv());
    });
  });
});
