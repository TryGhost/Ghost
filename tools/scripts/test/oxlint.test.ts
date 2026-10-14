import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const requireRoot = createRequire(path.join(root, 'package.json'));
const binary = path.join(path.dirname(requireRoot.resolve('oxlint/package.json')), 'bin/oxlint');
const config = JSON.parse(readFileSync(path.join(root, '.oxlintrc.json'), 'utf8'));
const ruleName = 'ghost/ghost-custom/no-native-error';
const ghost = requireRoot('eslint-plugin-ghost');

interface Diagnostic {
  code: string;
  severity: string;
  message: string;
  labels: { span: { line: number; column: number } }[];
}

function lint(code: string, filename: string, allOff = false) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'ghost-oxlint-'));
  try {
    const localConfig = structuredClone(config);
    for (const plugin of localConfig.jsPlugins) {
      plugin.specifier = path.resolve(root, plugin.specifier);
    }
    if (allOff) {
      localConfig.overrides = [];
    }
    writeFileSync(path.join(cwd, '.oxlintrc.json'), JSON.stringify(localConfig));
    mkdirSync(path.dirname(path.join(cwd, filename)), { recursive: true });
    writeFileSync(path.join(cwd, filename), code);
    const result = spawnSync(
      process.execPath,
      [binary, '--deny-warnings', '--format', 'json', filename],
      {
        cwd,
        encoding: 'utf8',
        timeout: 30_000,
      },
    );
    assert.ifError(result.error);
    assert.equal(result.stderr, '');
    assert.ok(result.status === 0 || result.status === 1, result.stdout);
    const output = JSON.parse(result.stdout) as {
      diagnostics: Diagnostic[];
      number_of_rules: number;
    };
    return { ...output, status: result.status };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test('all categories are off and only the custom rule reports JS/TS violations', () => {
  assert.ok(Object.values(config.categories).every((value) => value === 'off'));
  for (const [extension, source] of [
    ['js', "const unused = 1; console.log('ignored'); debugger; throw new Error('bad');"],
    ['ts', "const unused: string = 'ignored'; throw new Error('bad');"],
  ] as const) {
    const result = lint(source, `ghost/core/server/example.${extension}`);
    assert.equal(result.status, 1);
    assert.equal(result.number_of_rules, 1);
    assert.equal(result.diagnostics.length, 1);
    assert.equal(result.diagnostics[0]?.code, 'ghost(ghost-custom/no-native-error)');
    assert.equal(result.diagnostics[0]?.severity, 'error');
  }
});

test('valid Ghost errors and unrelated violations pass without warnings', () => {
  const result = lint(
    "const unused = 1; debugger; throw new errors.ValidationError({message: 'OK'});",
    'ghost/core/server/example.js',
  );
  assert.equal(result.status, 0);
  assert.deepEqual(result.diagnostics, []);
});

test('the first rule is limited to Core server code', () => {
  for (const filename of [
    'ghost/test/example.js',
    'apps/admin/example.ts',
    'packages/example/src/index.ts',
  ]) {
    const result = lint("throw new Error('outside scope');", filename);
    assert.equal(result.status, 0);
    assert.deepEqual(result.diagnostics, []);
  }
});

test('turning off the custom rule leaves no enabled rules', () => {
  const result = lint(
    "debugger; throw new Error('disabled');",
    'ghost/core/server/example.js',
    true,
  );
  assert.equal(result.status, 0);
  assert.equal(result.number_of_rules, 0);
  assert.deepEqual(result.diagnostics, []);
});

test('existing ESLint inline exceptions also suppress Oxlint diagnostics', () => {
  for (const directive of [
    `// eslint-disable-next-line ${ruleName}`,
    `/* eslint-disable ${ruleName} */`,
  ]) {
    const result = lint(
      `${directive}\nthrow new Error('intentional');`,
      'ghost/core/server/example.js',
    );
    assert.equal(result.status, 0);
    assert.deepEqual(result.diagnostics, []);
  }
});

test('Oxlint preserves ESLint messages and source positions', () => {
  const source = [
    "new Error('one');",
    'throw new Error();',
    "new errors.ValidationError({message: 'OK'});",
    "Error('existing rule only checks constructors');",
    "new TypeError('not matched by the existing rule');",
    "new globalThis.Error('not matched by the existing rule');",
  ].join('\n');
  const expected = new Linter().verify(source, [
    { plugins: { ghost }, rules: { [ruleName]: 'error' } },
  ]);
  const actual = lint(source, 'ghost/core/server/example.js');
  assert.equal(expected.length, 2);
  assert.deepEqual(
    actual.diagnostics
      .map((d) => [d.labels[0]?.span.line, d.labels[0]?.span.column, d.message])
      .sort(),
    expected.map((d) => [d.line, d.column, d.message]).sort(),
  );
});
