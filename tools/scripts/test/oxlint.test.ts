import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const requireRoot = createRequire(path.join(root, 'package.json'));
const binary = path.join(path.dirname(requireRoot.resolve('oxlint/package.json')), 'bin/oxlint');
const config = JSON.parse(readFileSync(path.join(root, '.oxlintrc.json'), 'utf8'));
const ruleName = 'ghost/ghost-custom/no-native-error';

interface Diagnostic {
  code: string;
  severity: string;
  message: string;
  labels: { span: { line: number; column: number } }[];
}

function lint(code: string, filename: string, allOff = false, rules?: Record<string, unknown>) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'ghost-oxlint-'));
  try {
    const localConfig = structuredClone(config);
    // Run a standalone copy so an accidental ESLint plugin import cannot resolve.
    cpSync(path.join(root, 'tools/configs/oxlint'), path.join(cwd, 'plugin'), { recursive: true });
    for (const plugin of localConfig.jsPlugins) {
      plugin.specifier = `./plugin/${path.basename(plugin.specifier)}`;
    }
    if (rules) {
      localConfig.overrides = [{ files: ['**/*'], rules }];
      localConfig.ignorePatterns = [];
    }
    if (allOff) {
      localConfig.overrides = [];
    }
    writeFileSync(path.join(cwd, '.oxlintrc.json'), JSON.stringify(localConfig));
    mkdirSync(path.dirname(path.join(cwd, filename)), { recursive: true });
    writeFileSync(path.join(cwd, filename), code);
    // Keep JSON output available when the requested fixture is globally ignored.
    writeFileSync(path.join(cwd, 'control.js'), '');
    const result = spawnSync(
      process.execPath,
      [binary, '--deny-warnings', '--format', 'json', filename, 'control.js'],
      {
        cwd,
        // Nx may set both colour variables; JSON diagnostics need neither.
        env: { ...process.env, FORCE_COLOR: undefined, NO_COLOR: '1' },
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

test('all categories are off and custom rules report JS/TS violations', () => {
  assert.ok(Object.values(config.categories).every((value) => value === 'off'));
  for (const [extension, source] of [
    ['js', "const unused = 1; console.log('ignored'); debugger; throw new Error('bad');"],
    ['ts', "const unused: string = 'ignored'; throw new Error('bad');"],
  ] as const) {
    const result = lint(source, `ghost/core/server/example.${extension}`);
    assert.equal(result.status, 1);

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

test('native errors remain allowed outside the migrated scopes', () => {
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

test('the migrated rule preserves constructor matching, messages and source positions', () => {
  const source = [
    "new Error('one');",
    'throw new Error();',
    "new errors.ValidationError({message: 'OK'});",
    "Error('existing rule only checks constructors');",
    "new TypeError('not matched by the existing rule');",
    "new globalThis.Error('not matched by the existing rule');",
  ].join('\n');
  const message = 'Direct calls to new Error() are not allowed. Please use @tryghost/errors.';
  const actual = lint(source, 'ghost/core/server/example.js', false, { [ruleName]: 'error' });
  assert.equal(actual.status, 1);
  assert.equal(actual.diagnostics.length, 2);
  assert.deepEqual(
    actual.diagnostics
      .map((d) => [d.labels[0]?.span.line, d.labels[0]?.span.column, d.message])
      .sort(),
    [
      [1, 1, message],
      [2, 7, message],
    ],
  );
});

const customPrefix = 'ghost/ghost-custom/';
const endpoint = (body: string) => `export default {browse: {query: function () {${body}\n}}};`;
const ruleCases = [
  { rule: 'no-native-error', invalid: 'new Error();', valid: 'new errors.ValidationError({});' },
  {
    rule: 'ghost-error-usage',
    invalid: "new errors.BadRequestError('bad');",
    valid: 'new errors.BadRequestError({message: messages.bad});',
  },
  { rule: 'ghost-tpl-usage', invalid: "tpl('hello');", valid: 'tpl(messages.hello);' },
  {
    rule: 'max-api-complexity',
    invalid: endpoint('if (a) {} if (b) {} if (c) {}'),
    valid: endpoint('if (a) {} if (b) {}'),
  },
  {
    rule: 'max-api-lines',
    invalid: endpoint('\n' + 'work();\n'.repeat(11)),
    valid: endpoint('\n// comment\n\nwork();'),
  },
  { rule: 'node-assert-methods', invalid: 'assert(value);', valid: 'assert.ok(value);' },
  {
    rule: 'node-assert-params',
    invalid: 'assert.equal(1, actual);',
    valid: 'assert.equal(actual, 1);',
  },
  {
    rule: 'node-assert-strict',
    invalid: "import assert from 'assert';",
    valid: "import assert from 'node:assert/strict'; assert.equal(actual, expected);",
  },
];

for (const { rule, invalid, valid } of ruleCases) {
  test(`${rule} runs independently on JavaScript and TypeScript`, () => {
    for (const extension of ['js', 'ts']) {
      const filename = `ghost/core/server/api/endpoints/example.${extension}`;
      const rules = { [customPrefix + rule]: 'error' };
      const failure = lint(invalid, filename, false, rules);
      assert.equal(failure.status, 1);
      assert.equal(failure.diagnostics.length, 1);
      assert.equal(failure.diagnostics[0]?.code, `ghost(ghost-custom/${rule})`);
      assert.equal(failure.diagnostics[0]?.severity, 'error');
      assert.deepEqual(lint(valid, filename, false, rules).diagnostics, []);
    }
  });
}

test('API limits preserve options, nesting and non-query exemptions', () => {
  const filename = 'ghost/core/server/api/endpoints/example.js';
  const source = endpoint('if (a) {}');
  assert.equal(
    lint(source, filename, false, { [customPrefix + 'max-api-complexity']: ['error', 1] }).status,
    1,
  );
  assert.equal(
    lint(source, filename, false, { [customPrefix + 'max-api-complexity']: ['error', { max: 2 }] })
      .status,
    0,
  );
  assert.equal(
    lint(endpoint('\nwork();\n'), filename, false, {
      [customPrefix + 'max-api-lines']: ['error', { max: 1 }],
    }).status,
    1,
  );
  assert.equal(
    lint('function helper() { if (a) {} if (b) {} if (c) {} }', filename, false, {
      [customPrefix + 'max-api-complexity']: 'error',
    }).status,
    0,
  );
  // The original rule counts nested helper branches towards the enclosing query.
  assert.equal(
    lint(endpoint('function nested() { if (a) {} if (b) {} if (c) {} }'), filename, false, {
      [customPrefix + 'max-api-complexity']: 'error',
    }).status,
    1,
  );
});

test('filename rules preserve options and exported-file exceptions', () => {
  const filename = 'ghost/core/server/Bad_Name.js';
  const name = 'local-filenames/match-regex';
  assert.equal(lint('const value = 1;', filename).status, 1);
  assert.equal(
    lint('module.exports = {};', filename, false, { [name]: ['error', '^[a-z-]+$', true] }).status,
    0,
  );
  assert.equal(
    lint('export default {};', filename, false, { [name]: ['error', '^[a-z-]+$', true] }).status,
    0,
  );
  assert.equal(
    lint('export default {};', filename, false, { [name]: ['error', '^[a-z-]+$', false] }).status,
    1,
  );
  assert.equal(lint('const value = 1;', 'ghost/core/frontend/helpers/ghost_head.js').status, 0);
  assert.equal(lint('const value = 1;', 'ghost/core/server/adapters/Bad_Name.js').status, 0);
});

test('Admin path checks cover strings and templates but exclude tests', () => {
  for (const source of ["const url = '/ghost/api/admin/';", 'const url = `/ghost/${path}`;']) {
    assert.equal(lint(source, 'apps/admin/src/example.tsx').status, 1);
    assert.equal(lint(source, 'apps/admin/src/example.test.tsx').status, 0);
    assert.equal(lint(source, 'apps/admin/test-utils/example.tsx').status, 0);
  }
  assert.equal(
    lint('const url = getGhostPaths().adminRoot;', 'apps/admin/src/example.tsx').status,
    0,
  );
});

test('reset safety preserves hook location and stale-fixture checks', () => {
  const filename = 'e2e/tests/example.test.ts';
  assert.equal(
    lint('test.beforeEach(async ({resetEnvironment}) => { await resetEnvironment(); });', filename)
      .status,
    0,
  );
  const invalid = lint(
    'test("example", async ({resetEnvironment}) => { await resetEnvironment(); });',
    filename,
  );
  assert.equal(invalid.status, 1);
  assert.match(invalid.diagnostics[0]!.message, /only supported inside beforeEach/);
  const stale = lint(
    'test.beforeEach(async ({resetEnvironment, page}) => { await resetEnvironment(); });',
    filename,
  );
  assert.equal(stale.status, 1);
  assert.match(stale.diagnostics[0]!.message, /fixtures become stale/);
  assert.equal(lint('resetEnvironment();', 'e2e/helpers/example.ts').status, 0);
});

test('package, tooling and API scopes retain their existing exceptions', () => {
  for (const filename of [
    'packages/checkout/src/example.ts',
    'packages/checkout/test/example.ts',
    'ghost/core/shared/example.ts',
    'ghost/scripts/example.js',
    'tools/gx/test/example.ts',
  ]) {
    assert.equal(lint('new Error();', filename).status, 1, filename);
  }
  for (const filename of [
    'packages/api-framework/test/example.ts',
    'packages/adapters/jobs-base/test/example.ts',
    'packages/adapters/storage-base/test/example.ts',
    'packages/limit-service/test/example.ts',
    'tools/scripts/lib/example.ts',
    'tools/gx/cli.ts',
  ]) {
    assert.equal(lint('new Error();', filename).status, 0, filename);
    assert.equal(lint("tpl('bad');", filename).status, 1, filename);
  }
  const complex = endpoint('if (a) {} if (b) {} if (c) {}');
  assert.equal(lint(complex, 'ghost/core/server/api/endpoints/example.js').status, 1);
  assert.equal(lint(complex, 'ghost/core/server/api/endpoints/utils/example.js').status, 0);
  assert.equal(lint("import assert from 'assert';", 'koenig/kg-utils/test/example.ts').status, 1);
  assert.equal(lint("import assert from 'assert';", 'koenig/kg-utils/src/example.ts').status, 0);
});

test('ported but previously disabled rules stay off', () => {
  const source =
    endpoint('\n' + 'work();\n'.repeat(11)) + '\nassert(value); assert.equal(1, actual);';
  assert.equal(lint(source, 'ghost/core/server/api/endpoints/example.js').status, 0);
});

test('Oxlint directives suppress migrated rules without ESLint exceptions', () => {
  for (const [filename, rule, source] of [
    ['ghost/core/server/example.js', customPrefix + 'ghost-tpl-usage', "tpl('bad');"],
    ['apps/admin/src/example.tsx', 'local/no-hardcoded-ghost-paths', "const url = '/ghost/api/';"],
    ['e2e/tests/example.test.ts', 'local/no-unsafe-reset-environment', 'resetEnvironment();'],
  ]) {
    assert.equal(lint(`// oxlint-disable-next-line ${rule}\n${source}`, filename!).status, 0);
  }
});

test('workspace ESLint configurations do not re-enable migrated rules', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `
    import {execFileSync} from 'node:child_process';
    import {pathToFileURL} from 'node:url';
    const files = execFileSync('git', ['ls-files', '*eslint.config.*'], {encoding: 'utf8'}).trim().split('\\n');
    const enabled = [];
    for (const file of files) {
      // These are not installed workspaces; the template uses the tested shared factory.
      if (file.startsWith('.github/') || file.includes('/_template/')) continue;
      const config = (await import(pathToFileURL(process.cwd() + '/' + file))).default;
      for (const block of [config].flat(Infinity)) {
        for (const [rule, value] of Object.entries(block.rules ?? {})) {
          if (!rule.startsWith('ghost/ghost-custom/') && !rule.startsWith('local/') && !rule.startsWith('local-filenames/')) continue;
          const severity = Array.isArray(value) ? value[0] : value;
          if (severity !== 'off' && severity !== 0) enabled.push({file, rule});
        }
      }
    }
    console.log(JSON.stringify(enabled));
  `,
    ],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: undefined, NO_COLOR: '1' },
      encoding: 'utf8',
      timeout: 30_000,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), []);
});

test('global ignores and the member-attribution allow-back are preserved', () => {
  for (const filename of [
    'ghost/core/frontend/src/example.js',
    'ghost/core/frontend/public/example.js',
    'ghost/core/built/example.js',
    'ghost/test/utils/fixtures/themes/casper/assets/Bad_Name.js',
    'packages/checkout/build/example.ts',
  ]) {
    assert.equal(lint('new Error();', filename).status, 0, filename);
  }
  assert.equal(
    lint('new Error();', 'ghost/core/frontend/src/member-attribution/example.js').status,
    1,
  );
});
