import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { inventory, parseSource, scoreFile } from '../typescript-inventory.js';
import { renderInventory } from '../lib/typescript-inventory-html.js';

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
  const git = (...args) => execFileSync('git', args, { cwd: root });
  const put = (file, content) => {
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
  assert.equal(report.summary.javascript, 3);
  assert.equal(report.summary.typescript, 1);
  assert.equal(report.summary.typescriptPercent, 25);
  assert.equal(report.summary.javascriptLines, 8);
  assert.equal(report.declarations, 1);
  assert.equal(report.excluded.length, 2);
  assert.deepEqual(report.warnings, []);
  const main = report.files.find((file) => file.path === 'src/main.js');
  assert.deepEqual(
    main.imports.map((item) => item.status),
    ['typed', 'javascript', 'typed', 'typed', 'javascript', 'unresolved'],
  );
  assert.deepEqual(main.dependents, ['test/main.test.js']);
  assert.equal(report.files.find((file) => file.path === 'src/legacy.js').dependents.length, 1);
  assert.equal(report.groups.category.tests.javascript, 1);
  const scoped = inventory(root, { scope: 'src' });
  assert.equal(scoped.summary.javascript, 2);
  assert.deepEqual(scoped.files.find((file) => file.path === 'src/main.js').dependents, [
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
    imports: [{ status: 'javascript' }, { status: 'unresolved' }],
    dynamicImports: 2,
  };
  assert.equal(scoreFile(risky).difficulty, 'harder');
  assert.ok(scoreFile(risky).score > scoreFile(base).score);
});

test('escapes report data so paths cannot inject script markup', () => {
  const html = renderInventory({ files: [{ path: '</script><script>alert(1)</script>' }] });
  assert.ok(!html.includes('</script><script>alert(1)'));
  assert.ok(html.includes('\\u003c/script>'));
});
