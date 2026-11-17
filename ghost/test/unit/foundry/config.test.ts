import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import { z } from 'zod';
import { createConfig, loadConfigSources } from '../../../core/foundry/config';

// Ghost's own config is tested in ../shared/config. These hold the framework's
// half to an application that is not Ghost.
describe('foundry config', function () {
  const schema = z.looseObject({
    env: z.string(),
    desk: z.object({ name: z.string().min(1), loanDays: z.number().int().positive() }),
  });
  const sources = { env: 'production', desk: { name: 'Front desk', loanDays: 14 } };

  describe('createConfig', function () {
    it('validates against the schema the application declares', function () {
      const config = createConfig(sources, { schema, name: 'Desk config' });
      assert.equal(config.get('desk:name'), 'Front desk');
      assert.equal(config.validated.desk.loanDays, 14);
      assert.throws(
        () => createConfig({ ...sources, desk: { name: '' } }, { schema, name: 'Desk config' }),
        /Desk config failed validation:\n {2}desk:name: /,
      );
    });

    it('freezes the tree, or guards it when the application asks', function () {
      const frozen = createConfig(sources, { schema });
      assert.ok(Object.isFrozen(frozen.get('desk')));
      const guarded = createConfig(sources, {
        schema,
        guard: () => true,
        guardHint: 'see the docs',
      });
      assert.throws(() => {
        (guarded.get('desk') as { name: string }).name = 'Other';
      }, /Config is read-only: attempted write to `desk:name`\. Build a derived object instead - see the docs\./);
    });

    it('reports instead of failing when the application says a tree is not strict', function () {
      const reported = sinon.stub(console, 'error');
      try {
        const config = createConfig(
          { ...sources, desk: { name: 'Front desk', loanDays: 'many' } },
          { schema, name: 'Desk config', strict: () => false },
        );
        assert.equal(config.get('desk:loanDays'), 'many');
        assert.match(
          String(reported.firstCall.args[0]),
          /Desk config failed validation \(not enforced in the production/,
        );
      } finally {
        reported.restore();
      }
    });

    it('hands out a slice parsed with the schema its reader declares', function () {
      const config = createConfig({ ...sources, lending: { renewals: 2 } }, { schema });
      const Lending = z.object({ renewals: z.number().int(), fines: z.boolean().default(false) });
      assert.deepEqual(config.slice('lending', Lending), { renewals: 2, fines: false });
      // A section nobody configured is read as empty, so defaults apply.
      assert.deepEqual(config.slice('missing', z.object({ on: z.boolean().default(true) })), {
        on: true,
      });
      assert.throws(
        () => config.slice('desk', z.object({ loanDays: z.string() })),
        (error: { message: string; code: string; context: string }) =>
          error.message === 'The desk config is not valid.' &&
          error.code === 'CONFIG_SLICE_INVALID' &&
          error.context.includes('loanDays'),
      );
    });

    it('rebuilds on set and reset, for tests', function () {
      const config = createConfig(sources, { schema });
      config.set('desk:name', 'Back desk');
      assert.equal(config.get('desk:name'), 'Back desk');
      assert.throws(() => config.set('desk:loanDays', -1));
      assert.equal(config.get('desk:loanDays'), 14);
      config.reset();
      assert.equal(config.get('desk:name'), 'Front desk');
    });
  });

  describe('loadConfigSources', function () {
    let root: string;
    const write = (file: string, content: object) => {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), JSON.stringify(content));
    };

    beforeEach(function () {
      root = mkdtempSync(path.join(tmpdir(), 'foundry-config-'));
      write('app/defaults.json', { desk: { name: 'Default', loanDays: 14 }, a: 'defaults' });
      write('app/env/config.staging.json', { desk: { name: 'Staging' }, b: 'env' });
      write('app/env/config.extra.json', { c: 'extra' });
      write('app/overrides.json', { fixed: true });
      write('custom/config.staging.json', { desk: { loanDays: 7 }, fixed: false });
      write('custom/config.local.json', { a: 'local', c: 'local' });
    });
    afterEach(function () {
      rmSync(root, { recursive: true, force: true });
    });

    const load = (options: object = {}) =>
      loadConfigSources({
        env: 'staging',
        baseDir: path.join(root, 'app'),
        customDir: path.join(root, 'custom'),
        ...options,
      });

    it('layers an application folder and a custom folder, first wins', function () {
      const tree = load();
      assert.deepEqual(tree.desk, { name: 'Staging', loanDays: 7 });
      assert.equal(tree.a, 'defaults');
      assert.equal(tree.b, 'env');
      // Nothing overrides the overrides.
      assert.equal(tree.fixed, true);
      assert.equal(tree.c, undefined);
    });

    it('reads local and extra files only when the application says so', function () {
      const tree = load({ local: true, extraEnvFiles: { extra: 'config.extra.json' } });
      assert.equal(tree.a, 'local');
      // The extra environment file is read before the local files.
      assert.equal(tree.c, 'extra');
    });

    it("hands each of the application's own stores to the application first", function () {
      const prepared: unknown[] = [];
      load({ prepareBundledStore: (store: unknown) => prepared.push(store) });
      assert.deepEqual(
        prepared.map((store) => Object.keys(store as object).sort()),
        [['fixed'], ['b', 'desk'], ['a', 'desk']],
      );
    });
  });
});
