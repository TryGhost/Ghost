import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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

function runLint(
  code: string,
  filename: string,
  allOff = false,
  rules?: Record<string, unknown>,
  boundarySource?: string,
) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'ghost-oxlint-'));
  try {
    const localConfig = structuredClone(config);
    // Run a standalone copy so an accidental ESLint plugin import cannot resolve.
    cpSync(path.join(root, 'tools/configs/oxlint'), path.join(cwd, 'tools/configs/oxlint'), {
      recursive: true,
    });
    const inventory = 'ghost/core/server/services/service-inventory.yaml';
    mkdirSync(path.dirname(path.join(cwd, inventory)), { recursive: true });
    writeFileSync(
      path.join(cwd, inventory),
      JSON.stringify({ services: { alpha: { migrated: true }, legacy: { migrated: false } } }),
    );
    writeFileSync(
      path.join(cwd, '.dependency-cruiser.cjs'),
      boundarySource ?? readFileSync(path.join(root, '.dependency-cruiser.cjs')),
    );
    const resolver = 'tools/scripts/ci/service-dependency-resolver.mjs';
    mkdirSync(path.dirname(path.join(cwd, resolver)), { recursive: true });
    cpSync(path.join(root, resolver), path.join(cwd, resolver));
    mkdirSync(path.join(cwd, 'node_modules'), { recursive: true });
    symlinkSync(path.join(root, 'node_modules/js-yaml'), path.join(cwd, 'node_modules/js-yaml'));
    for (const plugin of localConfig.jsPlugins) {
      plugin.specifier = `./tools/configs/oxlint/${path.basename(plugin.specifier)}`;
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
    return result;
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function lint(...args: Parameters<typeof runLint>) {
  const result = runLint(...args);
  assert.equal(result.stderr, '');
  assert.ok(result.status === 0 || result.status === 1, result.stdout);
  assert.ok(result.stdout.trimStart().startsWith('{'), result.stdout);
  const output = JSON.parse(result.stdout) as {
    diagnostics: Diagnostic[];
    number_of_rules: number;
  };
  return { ...output, status: result.status };
}

test('explains missing or malformed service dependency policy', () => {
  for (const policy of [
    {},
    { forbidden: {} },
    { forbidden: [] },
    { forbidden: [{ name: 'renamed-service-dependencies' }] },
    { forbidden: [{ name: 'service-dependencies', to: { pathNot: [] } }] },
    { forbidden: [{ name: 'service-dependencies', from: { path: 42 }, to: { pathNot: [] } }] },
    { forbidden: [{ name: 'service-dependencies', from: { path: '^services/' } }] },
    {
      forbidden: [
        { name: 'service-dependencies', from: { path: '^services/' }, to: { pathNot: '' } },
      ],
    },
    {
      forbidden: [
        { name: 'service-dependencies', from: { path: '^services/' }, to: { pathNot: [42] } },
      ],
    },
  ]) {
    const result = runLint(
      '',
      'ghost/core/server/example.ts',
      false,
      undefined,
      `module.exports = ${JSON.stringify(policy)};`,
    );
    assert.equal(result.status, 1);
    assert.match(
      result.stdout + result.stderr,
      /ghost\/no-injected-service-libraries: \.dependency-cruiser\.cjs must define service-dependencies with a string from\.path and a string array to\.pathNot/,
    );
  }
});

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

const serviceRoot = 'ghost/core/server/services/alpha/index.ts';
const injectionCode = 'ghost(no-injected-service-libraries)';

test('reports direct allowlisted bindings and members passed to local service constructors', () => {
  const source = [
    "import Service from './service';",
    "import * as constructors from './constructors';",
    "import tpl from '@tryghost/tpl';",
    "import {z as schema} from 'zod';",
    "import * as crypto from 'node:crypto';",
    "import {getUnixTime as now} from '../../../kernel/clock.js';",
    "const errors = require('@tryghost/errors');",
    "const {promisify: promise} = require('node:util');",
    "const legacy = require('../../../kernel/clock').moment;",
    "const {OtherService} = require('./other-service');",
    'new Service({tpl});',
    'new Service(schema);',
    'new Service({uuid: crypto.randomUUID});',
    'new Service({now});',
    'new Service({errors});',
    'new Service({promise});',
    'new Service({legacy});',
    "new constructors.Service({tpl: require('@tryghost/tpl')});",
    'new OtherService({nested: [tpl, {errors}]});',
    'new Service({...errors});',
    'new Service({tpl: tpl as unknown});',
    'new Service({tpl: tpl satisfies Function});',
    'new Service({tpl: tpl!});',
  ].join('\n');
  const result = lint(source, serviceRoot);
  assert.equal(result.status, 1);
  assert.equal(result.diagnostics.length, 14);
  assert.ok(result.diagnostics.every((d) => d.code === injectionCode && d.severity === 'error'));
  assert.deepEqual(
    result.diagnostics.map((d) => d.labels[0]?.span.line).sort((a, b) => a! - b!),
    [11, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 23],
  );
  assert.ok(result.diagnostics.some((d) => d.message.includes('Import @tryghost/tpl directly')));
});

test('keeps security primitives directly imported rather than injected into services', () => {
  const result = lint(
    `
    import Service from './service';
    import security from '@tryghost/security';
    new Service({encode: security.url.encodeBase64});
    `,
    serviceRoot,
  );
  assert.equal(result.status, 1);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0]?.code, injectionCode);
  assert.ok(result.diagnostics[0]?.message.includes('Import @tryghost/security directly'));
});

test('allows local library use, computed values, injected application dependencies and shadowed bindings', () => {
  const result = lint(
    `
    import Service from './service';
    import External from 'external-service';
    import OtherService from '../other/service';
    import errors from '@tryghost/errors';
    import {z} from 'zod';
    import {getUnixTime} from '../../../kernel/clock';
    import tpl from '@tryghost/tpl';
    import logging from '@tryghost/logging';
    const schema = z.object({url: z.string()});
    z.instanceof(errors.GhostError);
    new Service({startedAt: getUnixTime(), message: tpl(messages.hello), logging});
    new Service({error: new errors.GhostError({message: 'local'})});
    new Service({getConfig: () => schema.parse({url: 'example'})});
    new External({tpl});
    new OtherService({tpl});
    function make(tpl) { return new Service({tpl}); }
    function customLoader(require) { return new Service({loader: require('@tryghost/tpl')}); }
    function localConstructor(Service) { return new Service({tpl}); }
  `,
    serviceRoot,
  );
  assert.equal(result.status, 0);
  assert.deepEqual(result.diagnostics, []);
});

test('limits injection enforcement to migrated TypeScript wiring roots', () => {
  for (const filename of [
    'ghost/core/server/services/legacy/index.ts',
    'ghost/core/server/services/unlisted/index.ts',
    'ghost/core/server/services/alpha/helper.ts',
    'ghost/core/server/services/alpha/nested/index.ts',
    'ghost/core/server/services/alpha/index.js',
    'ghost/test/service.ts',
  ]) {
    const result = lint(
      "import Service from './service'; import tpl from '@tryghost/tpl'; new Service({tpl});",
      filename,
    );
    assert.equal(result.status, 0, filename);
    assert.deepEqual(result.diagnostics, []);
  }
});

test('shares the dependency-cruiser allowlist, including exact local files and package subpaths', () => {
  const source = `
    import Service from './service';
    import errors from '@tryghost/errors/subpath';
    import manifest from '@tryghost/app-contracts/manifest';
    import contracts from '@tryghost/app-contracts';
    import otherContract from '@tryghost/app-contracts/other';
    import objectId from 'bson-objectid';
    import boolean from '../../lib/db-types/boolean';
    import json from '../../lib/db-types/json';
    import lookalike from '@tryghost/errors-extra';
    import clock from '../../../kernel/clock-extra';
    import os from 'node:os';
    new Service({errors, manifest, contracts, otherContract, objectId, boolean, json, lookalike, clock, os});
  `;
  const original = lint(source, serviceRoot);
  assert.equal(original.diagnostics.length, 5);
  for (const library of [
    '@tryghost/errors/subpath',
    '@tryghost/app-contracts/manifest',
    'bson-objectid',
    '../../lib/db-types/boolean',
    '../../lib/db-types/json',
  ]) {
    assert.ok(
      original.diagnostics.some((d) => d.message.includes(`Import ${library} directly`)),
      library,
    );
  }
  const changed = readFileSync(path.join(root, '.dependency-cruiser.cjs'), 'utf8').replace(
    'const serviceDependencyAllowlist = [',
    () => "const serviceDependencyAllowlist = ['^node:os$',",
  );
  const result = lint(source, serviceRoot, false, undefined, changed);
  assert.equal(result.diagnostics.length, 6);
  assert.ok(result.diagnostics.some((d) => d.message.includes('node:os')));
});

test('recognizes exact JavaScript library paths without approving siblings', () => {
  const allowances = [
    String.raw`^ghost/core/server/lib/fixture-helper\.js$`,
    String.raw`^fixture-library$|(^|/)node_modules/fixture-library/index\.js$`,
  ];
  const boundarySource = readFileSync(path.join(root, '.dependency-cruiser.cjs'), 'utf8').replace(
    'const serviceDependencyAllowlist = [',
    () =>
      `const serviceDependencyAllowlist = [${allowances.map((pattern) => JSON.stringify(pattern)).join(',')},`,
  );
  const libraries = [
    '../../lib/fixture-helper',
    '../../lib/fixture-helper.js',
    'fixture-library',
    'fixture-library/index',
    'fixture-library/index.js',
  ];
  const siblings = [
    '../../lib/fixture-helper-extra',
    'fixture-library/other',
    'fixture-library-extra',
  ];
  const source = `
    import Service from './service';
    ${[...libraries, ...siblings].map((name, i) => `import dep${i} from '${name}';`).join('\n')}
    new Service({${[...libraries, ...siblings].map((_, i) => `dep${i}`).join(',')}});
  `;
  const result = lint(source, serviceRoot, false, undefined, boundarySource);
  assert.equal(result.status, 1);
  assert.equal(result.diagnostics.length, libraries.length);
  for (const library of libraries) {
    assert.ok(
      result.diagnostics.some((d) => d.message.includes(`Import ${library} directly`)),
      library,
    );
  }
});

test('keeps the guard bounded to direct constructor wiring and supports explicit exceptions', () => {
  const result = lint(
    `
    import Service from './service';
    import createService from './factory';
    import tpl from '@tryghost/tpl';
    const options = {tpl};
    new Service(options);
    createService({tpl});
    new Service({format: (...args) => tpl(...args)});
    // oxlint-disable-next-line ghost/no-injected-service-libraries -- explicit test exception
    new Service({tpl});
  `,
    serviceRoot,
  );
  assert.equal(result.status, 0);
  assert.deepEqual(result.diagnostics, []);
});

test('handles TypeScript require imports and literal dynamic imports', () => {
  const result = lint(
    `
    import Service = require('./service');
    import tpl = require('@tryghost/tpl');
    const {getUnixTime} = await import('../../../kernel/clock');
    const {OtherService} = await import('./other-service');
    new Service({tpl});
    new OtherService({getUnixTime});
    new Service({clock: await import('../../../kernel/clock')});
  `,
    serviceRoot,
  );
  assert.equal(result.status, 1);
  assert.equal(result.diagnostics.length, 3);
  assert.ok(result.diagnostics.every((d) => d.code === injectionCode));
});

const canonicalCode = 'ghost(prefer-canonical-types)';
const canonicalFile = 'ghost/core/server/services/alpha/alpha-service';

test('flags hand-written logger shapes whatever they are called', () => {
  const source = [
    'type Logging = {',
    '  info(...args: unknown[]): void;',
    '  error(...args: unknown[]): void;',
    '};',
    'interface Logger {',
    '  warn(message: string): void;',
    '}',
    'type Reporter = { debug: (message: string) => void; fatal: Function };',
    'type Deps = { logging: { trace(message: string): void } };',
  ].join('\n');
  const result = lint(source, `${canonicalFile}.ts`);
  assert.equal(result.status, 1);
  assert.ok(result.diagnostics.every((d) => d.code === canonicalCode && d.severity === 'error'));
  assert.deepEqual(
    result.diagnostics.map((d) => d.labels[0]?.span.line).sort((a, b) => a! - b!),
    [1, 5, 8, 9],
  );
  assert.ok(
    result.diagnostics.every((d) =>
      d.message.includes("import type { GhostLogger } from '@tryghost/logging'"),
    ),
  );
});

test('allows the library logger type and shapes that are not loggers', () => {
  const source = [
    "import type { GhostLogger } from '@tryghost/logging';",
    "type Deps = { logging: Pick<GhostLogger, 'info' | 'error'>; other: GhostLogger };",
    'type Failure = { error: string; info: { code: number } };',
    'type Store = { info(): void; get(key: string): unknown };',
    'interface Extended extends Deps { warn(message: string): void }',
    'type Empty = {};',
  ].join('\n');
  assert.deepEqual(lint(source, `${canonicalFile}.ts`).diagnostics, []);
});

test('flags JSDoc logger shapes in JavaScript but not library or data types', () => {
  const source = [
    '/**',
    ' * @param {{info: (message: string) => unknown, warn: Function}} logging',
    " * @param {Pick<import('@tryghost/logging').GhostLogger, 'info'>} other",
    ' * @param {{id: string, error: {code: number; message: string} | null}} event',
    ' * @param {{logging: {error(err: unknown): void}, name: string}} deps',
    ' * @param {{',
    ' *   info: Function,',
    ' *   warn(message: string): void',
    ' * }} multiline',
    ' * @param {{',
    ' *   warn(message: string): void',
    ' *   error: (message: string)',
    ' *     => void',
    ' * }} newlines',
    ' * @param {{',
    ' *   info(): void',
    ' *   get(): string',
    ' * }} mixed',
    ' */',
    'function example(logging, other, event, deps, multiline, newlines, mixed) {}',
  ].join('\n');
  const result = lint(source, `${canonicalFile}.js`);
  assert.equal(result.status, 1);
  assert.deepEqual(
    result.diagnostics.map((d) => [d.code, d.labels[0]?.span.line]),
    [
      [canonicalCode, 2],
      [canonicalCode, 5],
      [canonicalCode, 6],
      [canonicalCode, 10],
    ],
  );
  assert.ok(
    result.diagnostics.every((d) => d.message.includes("import('@tryghost/logging').GhostLogger")),
  );
});

test('limits canonical type checks to Ghost Core', () => {
  const source = 'type Logging = { info(message: string): void };';
  assert.equal(lint(source, `${canonicalFile}.ts`).status, 1);
  assert.equal(lint(source, 'ghost/test/utils/example.ts').status, 0);
  assert.equal(lint(source, 'apps/admin/src/example.ts').status, 0);
});
