import type {
  Inventory,
  SourceFile,
  ResolvedDependency,
} from '../lib/typescript-inventory-types.ts';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { category, inventory, parseSource, scoreFile } from '../typescript-inventory.ts';
import { buildFileTree, renderInventory } from '../lib/typescript-inventory-html.ts';

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
  put('fixtures/example.js', 'not real source');
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

test('escapes report data so paths cannot inject script markup', () => {
  const file: SourceFile = {
    path: '</script><script>alert(1)</script>',
    package: 'test',
    category: 'tooling',
    language: 'javascript',
    dependents: [],
    ...parseSource('a.js', ''),
    imports: [],
    ...scoreFile({ ...parseSource('a.js', ''), imports: [] }),
  };
  const report: Inventory = {
    schemaVersion: 2,
    revision: 'a'.repeat(40),
    scope: '',
    files: [file],
    summary: {
      javascript: 1,
      typescript: 0,
      javascriptLines: 0,
      typescriptLines: 0,
      typescriptPercent: 0,
      typescriptLinePercent: 0,
    },
    groups: { category: {}, package: {} },
    declarations: 0,
    excluded: [],
    warnings: [],
  };
  const html = renderInventory(report);
  assert.ok(!html.includes('</script><script>alert(1)'));
  assert.ok(html.includes('\\u003c/script>'));
  assert.ok(!html.includes('Object.defineProperty(exports'));
  assert.ok(!html.includes('export {};'));
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

test('folder tree rolls up nested JS and TS totals without mixing similarly named folders', () => {
  const tree = buildFileTree([
    { path: 'root.js', language: 'javascript' },
    { path: 'apps/admin/app.tsx', language: 'typescript' },
    { path: 'apps/admin/helpers/a.js', language: 'javascript' },
    { path: 'apps/admin/helpers/b.ts', language: 'typescript' },
    { path: 'apps/admin-x/index.ts', language: 'typescript' },
    { path: 'ghost/core/index.cjs', language: 'javascript' },
  ]);
  assert.equal(tree.javascript, 3);
  assert.equal(tree.typescript, 3);
  assert.deepEqual(
    tree.children.map((node) => node.name),
    ['apps', 'ghost', 'root.js'],
  );
  const apps = tree.children[0]!;
  assert.ok('children' in apps);
  assert.equal(apps.javascript, 1);
  assert.equal(apps.typescript, 3);
  const admin = apps.children.find((node) => node.name === 'admin');
  assert.ok(admin && 'children' in admin);
  assert.equal(admin.javascript, 1);
  assert.equal(admin.typescript, 2);
  assert.deepEqual(
    admin.children.map((node) => node.name),
    ['helpers', 'app.tsx'],
  );
  assert.deepEqual('children' in admin.children[0]! ? admin.children[0].children[0] : undefined, {
    name: 'a.js',
    path: 'apps/admin/helpers/a.js',
    language: 'javascript',
  });
  assert.deepEqual(buildFileTree([]).children, []);
});
