import assert from 'node:assert/strict';
import _ from 'lodash';
import { guardReadOnly, shouldGuard } from '../../../../core/shared/config/guard';

// Stands in for Ghost's production .js files and its CommonJS dependencies.
// A test file is no use here: vitest compiles those to ESM, which is always
// strict, so a write would throw with or without the guard.
const sloppy = require('../../../utils/fixtures/sloppy-config-writer');

describe('Config read-only guard', function () {
  afterEach(function () {
    vi.unstubAllEnvs();
  });

  it('uses a sloppy-mode fixture, or it would prove nothing', function () {
    assert.ok(sloppy.isSloppy());

    // the baseline the guard exists to fix: frozen is silent here
    const frozen = Object.freeze({ a: 1 });
    sloppy.write(frozen, 'a', 2);
    assert.equal(frozen.a, 1);
  });

  describe('shouldGuard', function () {
    beforeEach(function () {
      // the default behaviour is what is under test here, so do not inherit a
      // GHOST_CONFIG_GUARD a developer happens to have exported
      vi.stubEnv('GHOST_CONFIG_GUARD', undefined);
    });

    it('covers the environments this repo runs itself', function () {
      assert.ok(shouldGuard('development'));
      assert.ok(shouldGuard('testing'));
      assert.ok(shouldGuard('testing-mysql'));
    });

    it('leaves production and anything unrecognised to the freeze', function () {
      assert.ok(!shouldGuard('production'));
      assert.ok(!shouldGuard('staging'));
      assert.ok(!shouldGuard('whatever-an-embedder-picked'));
    });

    it('is overridable in either direction', function () {
      vi.stubEnv('GHOST_CONFIG_GUARD', 'true');
      assert.ok(shouldGuard('production'));

      vi.stubEnv('GHOST_CONFIG_GUARD', 'false');
      assert.ok(!shouldGuard('testing'));
    });
  });

  describe('refusing writes', function () {
    it('throws on a write from sloppy-mode code, naming the key path', function () {
      const config = guardReadOnly({ paths: { contentPath: '/a' } });

      assert.throws(
        () => sloppy.write(config.paths, 'contentPath', '/b'),
        /read-only: attempted write to `paths:contentPath`/,
      );
      assert.throws(() => sloppy.write(config, 'paths', {}), /write to `paths`/);
    });

    it('throws on delete, defineProperty and setPrototypeOf', function () {
      const config = guardReadOnly({ paths: { contentPath: '/a' } });

      assert.throws(() => sloppy.remove(config.paths, 'contentPath'), /write to/);
      assert.throws(() => Object.defineProperty(config, 'x', { value: 1 }), /write to `x`/);
      assert.throws(() => Object.setPrototypeOf(config, null), /\[\[Prototype\]\]/);
    });

    it('refuses a write through a property descriptor', function () {
      const config = guardReadOnly({ paths: { contentPath: '/a' } });

      // without a getOwnPropertyDescriptor trap this hands back the raw child,
      // and a write through it misses every other trap
      const descriptor = Object.getOwnPropertyDescriptor(config, 'paths') as {
        value: { contentPath: string };
      };

      assert.throws(() => sloppy.write(descriptor.value, 'contentPath', '/b'), /write to/);
      assert.equal(config.paths.contentPath, '/a');
    });

    it('refuses writes into an array', function () {
      const config = guardReadOnly({ apps: { internal: ['a'] } });

      assert.throws(() => sloppy.write(config.apps.internal, 0, 'b'), /write to `apps:internal:0`/);
    });
  });

  describe('leaving reads alone', function () {
    const source = {
      url: 'http://localhost:2368',
      paths: { contentPath: '/a', nested: { deep: true } },
      apps: { internal: ['private-blogging', 'subscribers'] },
    };

    it('reads through at every depth', function () {
      const config = guardReadOnly(_.cloneDeep(source));

      assert.equal(config.url, 'http://localhost:2368');
      assert.equal(config.paths.contentPath, '/a');
      assert.equal(config.paths.nested.deep, true);
      assert.equal(config.apps.internal[1], 'subscribers');
    });

    it('keeps the operations callers actually use working', function () {
      const config = guardReadOnly(_.cloneDeep(source));

      assert.deepEqual(Object.keys(config).sort(), ['apps', 'paths', 'url']);
      assert.ok('paths' in config);
      assert.deepEqual({ ...config.paths }, source.paths);
      assert.deepEqual(JSON.parse(JSON.stringify(config)), source);
      assert.deepEqual(_.cloneDeep(config), source);
      assert.deepEqual([...config.apps.internal], source.apps.internal);
      assert.deepEqual(
        config.apps.internal.map((name: string) => name.length),
        [16, 11],
      );
      assert.equal(config.apps.internal.length, 2);
    });

    it('hands back the same wrapper for the same subtree', function () {
      const config = guardReadOnly(_.cloneDeep(source));

      // callers compare config objects by identity; a fresh proxy per read
      // would break that, and would not terminate on a cycle
      assert.equal(config.paths, config.paths);
    });

    it('terminates on a cycle', function () {
      const cyclic: Record<string, unknown> = { name: 'root' };
      cyclic.self = cyclic;

      const config = guardReadOnly(cyclic) as { name: string; self: { self: { name: string } } };

      assert.equal(config.self.self.name, 'root');
    });

    it('leaves values it must not wrap untouched', function () {
      const date = new Date();
      const config = guardReadOnly({ when: date, scalar: 1, nothing: null });

      assert.equal(config.when, date);
      assert.equal(config.scalar, 1);
      assert.equal(config.nothing, null);
    });
  });
});
