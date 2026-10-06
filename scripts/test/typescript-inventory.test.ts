import type { ResolvedDependency } from '../lib/typescript-inventory-types.ts';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  category,
  excludedSource,
  inventory,
  inventoryAtRevision,
  parseSource,
  scoreFile,
} from '../typescript-inventory.ts';

test('parses real imports, re-exports and computed calls without matching comments or strings', () => {
  const result = parseSource(
    'sample.jsx',
    `
    // require('ignored')
    const text = "import x from 'also-ignored'";
    import x from 'typed';
    export {x} from 're-export';
    const y = require('legacy');
    require('legacy');
    import('lazy');
    require(name);
    import(prefix + '/file');
    module.exports = () => <div/>;
  `,
  );
  assert.deepEqual(
    result.imports.map((item) => item.specifier),
    ['typed', 're-export', 'legacy', 'lazy'],
  );
  assert.equal(result.dynamicImports, 2);
  assert.equal(result.commonjs, true);
  assert.equal(result.parseErrors, 0);
  assert.equal(result.functions, 1);
});

test('inventories tracked files and resolves aliases, declarations, package exports and JS edges', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ghost-ts-inventory-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root });
  const put = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };
  git('init');
  put('package.json', '{"name":"sample","type":"module"}');
  put(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
        paths: { '@local/*': ['./src/*'] },
      },
    }),
  );
  put('src/typed.ts', 'export const typed = 1;\n');
  put('src/legacy.js', 'module.exports = 1;\n');
  put('src/declared.d.ts', 'export const declared: number;\n');
  put(
    'src/main.js',
    `import {typed} from '@local/typed.js';\nimport './legacy.js';\nimport './declared.js';\nimport 'typed-package';\nimport 'untyped-package';\nimport 'missing-package';\n`,
  );
  put('test/main.test.js', "import '../src/main.js';\n");
  put('vendor/example.js', 'not maintained source');
  put('dist/output.js', 'generated');
  git('add', '.');
  git(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.com',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '-m',
    'Fixture',
  );
  put('untracked.js', 'not part of the inventory');
  put(
    'node_modules/typed-package/package.json',
    '{"name":"typed-package","exports":{"types":"./index.d.ts","default":"./index.js"}}',
  );
  put('node_modules/typed-package/index.d.ts', 'export const value: number;');
  put('node_modules/untyped-package/package.json', '{"name":"untyped-package","main":"index.js"}');
  put('node_modules/untyped-package/index.js', 'module.exports = 1;');
  const report = inventory(root);
  const historical = inventoryAtRevision(root, 'HEAD');
  assert.deepEqual(historical.summary, report.summary);
  assert.deepEqual(historical.groups, report.groups);
  assert.equal(historical.declarations, report.declarations);
  assert.deepEqual(historical.excluded, report.excluded);
  assert.equal(historical.revision, report.revision);
  assert.equal(historical.mode, 'counts-only');
  assert.equal('files' in historical, false);
  assert.deepEqual(
    inventoryAtRevision(root, 'HEAD', 'src').summary,
    inventory(root, { scope: 'src' }).summary,
  );
  assert.throws(() => inventoryAtRevision(root, 'HEAD', 'missing'), /No tracked source/);
  assert.throws(() => inventoryAtRevision(root, '--help'));

  assert.equal(report.schemaVersion, 2);
  assert.equal(report.groups.category.backend!.javascript, 2);
  assert.equal(report.groups.category.production, undefined);
  assert.equal(report.summary.javascript, 3);
  assert.equal(report.summary.typescript, 1);
  assert.equal(report.summary.typescriptPercent, 25);
  assert.equal(report.summary.javascriptLines, 8);
  assert.equal(report.declarations, 1);
  assert.equal(report.excluded.length, 2);
  assert.deepEqual(report.warnings, []);
  const main = report.files.find((file) => file.path === 'src/main.js');
  assert.ok(main);
  assert.deepEqual(
    main.imports.map((item) => item.status),
    ['typed', 'javascript', 'typed', 'typed', 'javascript', 'unresolved'],
  );
  assert.deepEqual(main.dependents, ['test/main.test.js']);
  assert.equal(report.files.find((file) => file.path === 'src/legacy.js')!.dependents.length, 1);
  assert.equal(report.groups.category.tests!.javascript, 1);
  const scoped = inventory(root, { scope: 'src' });
  assert.equal(scoped.summary.javascript, 2);
  assert.deepEqual(scoped.files.find((file) => file.path === 'src/main.js')!.dependents, [
    'test/main.test.js',
  ]);
  assert.throws(() => inventory(root, { scope: 'missing' }), /No tracked source/);
  put('src/legacy.js', 'uncommitted\nextra\nlines');
  assert.deepEqual(inventoryAtRevision(root, 'HEAD').summary, report.summary);
});

test('unknown and dynamic dependencies make a candidate harder', () => {
  const base = {
    imports: [],
    dynamicImports: 0,
    lines: 20,
    functions: 1,
    commonjs: false,
    parseErrors: 0,
  };
  assert.equal(scoreFile(base).difficulty, 'easier');
  const risky = {
    ...base,
    imports: [{ status: 'javascript' }, { status: 'unresolved' }] satisfies Pick<
      ResolvedDependency,
      'status'
    >[],
    dynamicImports: 2,
  };
  assert.equal(scoreFile(risky).difficulty, 'harder');
  assert.ok(scoreFile(risky).score > scoreFile(base).score);
});

test('splits production by codebase area while preserving tests and tooling', () => {
  for (const file of [
    'apps/admin/src/app.tsx',
    'apps/portal/src/index.js',
    'koenig/koenig-lexical/src/index.ts',
    'koenig/kg-simplemde/src/js/simplemde.js',
    'koenig/kg-unsplash-selector/src/index.tsx',
    'ghost/core/core/frontend/public/private.js',
  ]) {
    assert.equal(category(file), 'frontend', file);
  }
  for (const file of [
    'ghost/core/core/server/services/members/index.js',
    'ghost/core/core/frontend/services/routing/index.js',
    'packages/api-framework/src/index.ts',
    'koenig/kg-lexical-html-renderer/src/index.ts',
    'koenig/kg-default-nodes/src/index.ts',
  ]) {
    assert.equal(category(file), 'backend', file);
  }
  assert.equal(category('apps/admin/src/app.test.tsx'), 'tests');
  assert.equal(category('koenig/kg-default-nodes/test/index.test.ts'), 'tests');
  assert.equal(category('ghost/core/test/unit/frontend/public/private.test.js'), 'tests');
  assert.equal(category('apps/portal/vite.config.js'), 'tooling');
  assert.equal(category('koenig/koenig-lexical/scripts/build.js'), 'tooling');
});

test('counts maintained fixture modules and classifies test support without hiding backend fixtures', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'inventory-fixtures-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const included: [string, string][] = [
    ['apps/admin/src/editor/engine/__fixtures__/after-load.test.tsx', 'tests'],
    ['apps/admin/src/editor/engine/__fixtures__/index.ts', 'tests'],
    ['apps/admin/test-utils/fixtures/query-client.tsx', 'tests'],
    ['apps/ember-admin/mirage/fixtures/configs.js', 'tests'],
    ['ghost/core/core/server/data/schema/fixtures/fixture-manager.js', 'backend'],
    ['ghost/core/core/server/data/schema/fixtures/index.js', 'backend'],
    ['ghost/core/test/unit/server/data/schema/fixtures/fixture-manager.test.js', 'tests'],
    ['ghost/core/test/utils/fixtures/email-service/malformed-css.js', 'tests'],
    ['packages/image-transform/test/integration/fixtures/index.ts', 'tests'],
    ['packages/testing/test-data/src/fixtures/data/config.ts', 'tests'],
    ['packages/testing/test-data/src/fixtures/index.ts', 'tests'],
  ];
  const excluded = [
    'ghost/core/test/unit/frontend/services/assets-minification/fixtures/basic-cards/js/gallery.js',
    'ghost/core/test/utils/fixtures/sloppy-config-writer.js',
    'ghost/core/test/utils/fixtures/themes/casper/assets/built/casper.js',
    'ghost/core/test/utils/fixtures/themes/source/assets/built/source.js',
    'apps/ember-admin/vendor/keymaster/keymaster.js',
    'ghost/core/core/frontend/public/admin-auth/admin-auth.min.js',
    'koenig/kg-simplemde/debug/simplemde.debug.js',
    'koenig/kg-simplemde/dist/simplemde.min.js',
    'packages/_template/src/index.ts',
  ];
  for (const file of [...included.map(([entryPath]) => entryPath), ...excluded]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), 'export const value = 1;\n');
  }
  execFileSync('git', ['init'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-m',
      'Fixture',
    ],
    { cwd: root },
  );
  const report = inventory(root);
  assert.equal(report.measurementVersion, 2);
  assert.equal(report.files.length, included.length);
  assert.equal(report.summary.javascript, 5);
  assert.equal(report.summary.typescript, 6);
  assert.deepEqual(report.excluded.sort(), excluded.sort());
  for (const [file, expected] of included) {
    assert.equal(report.files.find((entry) => entry.path === file)?.category, expected, file);
  }
  assert.equal(excludedSource('ghost/core/test/utils/fixtures/themes/custom/index.ts'), false);
  assert.equal(
    excludedSource('ghost/core/test/utils/fixtures/sloppy-config-writer.test.ts'),
    false,
  );
});

test('separates developer tooling from runtime configuration', () => {
  for (const file of [
    '.lintstagedrc.cjs',
    '.lintstagedrc.cts',
    'lint-staged.config.ts',
    'apps/ember-admin/lib/asset-delivery/index.js',
    'apps/ember-admin/lib/check-node-version.js',
    'apps/ember-admin/lib/ember-power-calendar-moment/index.js',
    'apps/ember-admin/lib/ember-power-calendar-utils/index.js',
    '.pnpmfile.mjs',
    '.dependency-cruiser.cjs',
    'configs/eslint/index.mjs',
    'configs/eslint-react/index.mjs',
    'configs/vitest/index.mjs',
    'configs/vite-public-app/index.mjs',
    'apps/ember-admin/.template-lintrc.js',
    'apps/ember-admin/.lint-todorc.js',
    'apps/ember-admin/ember-cli-build.js',
    'apps/ember-admin/testem.js',
    'apps/ember-admin/config/environment.js',
    'apps/admin/vite.shared.ts',
    'apps/admin/vite-backend-proxy.ts',
    'apps/admin/vite-ember-assets.ts',
    'apps/comments-ui/vite-plugin-strip-fingerprinting.ts',
    'koenig/vitest.shared.ts',
    'packages/i18n/generate-context.js',
    'e2e/playwright.config.mjs',
    'e2e/eslint.config.js',
    'e2e/scripts/capture-stripe-fixtures.ts',
    'ghost/core/vitest.config.db.ts',
    'apps/admin/vitest.acceptance.config.ts',
    'apps/shade/.storybook/main.ts',
    'scripts/release.js',
  ]) {
    assert.equal(category(file), 'tooling', file);
  }
  for (const file of [
    'apps/ember-admin/lib/ember-power-calendar-utils/addon/index.js',
    'apps/admin/src/editor/card-config.ts',
    'apps/admin/src/sentry/sentry-config.ts',
    'apps/admin-toolbar/src/config.js',
    'apps/ember-admin/app/services/config-manager.js',
    'apps/admin-x-framework/src/api/config.ts',
  ]) {
    assert.equal(category(file), 'frontend', file);
  }
  for (const file of [
    'ghost/core/core/shared/config/index.ts',
    'ghost/core/core/frontend/services/theme-engine/config/index.js',
    'ghost/core/core/server/services/mail/config.js',
    'ghost/core/MigratorConfig.js',
  ]) {
    assert.equal(category(file), 'backend', file);
  }
  for (const file of [
    'scripts/test/config.test.ts',
    'configs/eslint/test/rules.test.ts',
    'apps/ember-admin/mirage/config/settings.js',
    'e2e/data-factory/setup.ts',
    'packages/testing/test-data/src/fixtures/data/config.ts',
  ]) {
    assert.equal(category(file), 'tests', file);
  }
});
