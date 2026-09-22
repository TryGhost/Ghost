import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import _ from 'lodash';
import { z } from 'zod';
import { configSchema } from '../../../../core/shared/config/schema';
import {
  collectLooseSections,
  collectTodos,
  todo,
} from '../../../../core/shared/config/schema/ratchet';
import {
  LOOSE_ALLOWLIST,
  TODO_ALLOWLIST,
} from '../../../../core/shared/config/schema/ratchet-allowlist';

const configDir = path.join(__dirname, '../../../../core/shared/config');

function readJson(...parts: string[]): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(configDir, ...parts), 'utf8'));
}

describe('Config Schema', function () {
  describe('ratchet', function () {
    it('pins every unratcheted section', function () {
      assert.deepEqual(collectTodos(configSchema), [...TODO_ALLOWLIST].sort());
    });

    it('pins every section that still accepts unknown keys', function () {
      assert.deepEqual(collectLooseSections(configSchema), [...LOOSE_ALLOWLIST].sort());
    });

    it('finds nested todos and unwraps optionals', function () {
      const schema = z.looseObject({
        outer: z.looseObject({ inner: todo() }),
        wrapped: todo().optional(),
      });

      assert.deepEqual(collectTodos(schema), ['outer.inner', 'wrapped']);
    });

    it('accepts anything, including nothing, for an unratcheted section', function () {
      const schema = z.looseObject({ section: todo() });

      assert.deepEqual(schema.parse({}), {});
      assert.deepEqual(schema.parse({ section: { any: ['shape'] } }), {
        section: { any: ['shape'] },
      });
    });
  });

  describe('parsing the config Ghost ships', function () {
    const defaults = readJson('defaults.json');
    const overrides = readJson('overrides.json');
    const envFiles = fs.readdirSync(path.join(configDir, 'env')).filter((f) => f.endsWith('.json'));

    // Anything this rejects or rewrites is config a running Ghost already has.
    // The ratchet only ever adds validation, never transformation.
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

    it('keeps unknown top-level keys', function () {
      const parsed = configSchema.parse({
        env: 'testing',
        url: 'http://localhost:2368',
        somethingProInjects: { nested: true },
      });

      assert.deepEqual(parsed.somethingProInjects, { nested: true });
    });
  });

  describe('url', function () {
    it('requires a protocol, matching the long-standing boot check', function () {
      assert.ok(configSchema.safeParse({ env: 'testing', url: 'my-ghost-blog.com' }).error);
      assert.ok(
        configSchema.safeParse({ env: 'testing', url: 'http://my-ghost-blog.com' }).success,
      );
      assert.ok(
        configSchema.safeParse({ env: 'testing', url: 'https://my-ghost-blog.com/blog/' }).success,
      );
    });
  });
});
