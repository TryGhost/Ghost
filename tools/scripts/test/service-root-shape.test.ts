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
import yaml from 'js-yaml';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const requireRoot = createRequire(path.join(root, 'package.json'));
const binary = path.join(path.dirname(requireRoot.resolve('oxlint/package.json')), 'bin/oxlint');
const config = JSON.parse(readFileSync(path.join(root, '.oxlintrc.json'), 'utf8'));
const ruleName = 'ghost/service-root-shape';
const helperImport = '../../../kernel/define-service';
const prefix = `import { defineService } from '${helperImport}';\n`;
const factory = `defineService('Example', () => ({}))`;

interface Diagnostic {
  code: string;
  message: string;
  severity: string;
  labels: { span: { line: number; column: number } }[];
}

function lint(code: string, filename = 'ghost/core/server/services/app-installations/index.ts') {
  const cwd = mkdtempSync(path.join(tmpdir(), 'ghost-service-root-oxlint-'));
  try {
    const localConfig = structuredClone(config);
    // A standalone copy must not resolve any ESLint plugin or parser dependencies.
    cpSync(path.join(root, 'tools/configs/oxlint'), path.join(cwd, 'tools/configs/oxlint'), {
      recursive: true,
    });
    // The injection guard loads the shared service policy from the repository root.
    for (const file of [
      '.dependency-cruiser.cjs',
      'tools/scripts/ci/service-dependency-resolver.mjs',
      'ghost/core/server/services/service-inventory.yaml',
    ]) {
      mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
      cpSync(path.join(root, file), path.join(cwd, file));
    }
    mkdirSync(path.join(cwd, 'node_modules'), { recursive: true });
    symlinkSync(path.join(root, 'node_modules/js-yaml'), path.join(cwd, 'node_modules/js-yaml'));
    for (const plugin of localConfig.jsPlugins) {
      plugin.specifier = `./tools/configs/oxlint/${path.basename(plugin.specifier)}`;
    }
    writeFileSync(path.join(cwd, '.oxlintrc.json'), JSON.stringify(localConfig));
    mkdirSync(path.dirname(path.join(cwd, filename)), { recursive: true });
    writeFileSync(path.join(cwd, filename), code);
    const result = spawnSync(
      process.execPath,
      [binary, '--deny-warnings', '--format', 'json', filename],
      {
        cwd,
        env: { ...process.env, FORCE_COLOR: undefined, NO_COLOR: '1' },
        encoding: 'utf8',
        timeout: 30_000,
      },
    );
    assert.ifError(result.error);
    assert.equal(result.stderr, '');
    assert.ok(result.status === 0 || result.status === 1, result.stdout);
    const output = JSON.parse(result.stdout) as { diagnostics: Diagnostic[] };
    return { ...output, status: result.status };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const valid = [
  ['empty module marker', `export {}; export default ${factory};`],
  ['default initializer', `export default ${factory};`],
  [
    'erased type exports',
    `export type { Actor } from './actions'; export { type Result } from './models';
    export interface Context { actor: string } export type Id = string; export default ${factory};`,
  ],
  [
    'explicit extras',
    `const extras = { isAvailable, actingContext }; const root = defineService('Example', create, extras); export default root;`,
  ],
  ['inline extras', `export default defineService('Example', create, { scheduleCheckJob });`],
  ['initializer alias', `const first = ${factory}; const second = first; export default second;`],
  [
    'shadowed root',
    `const root = ${factory}; function run(root) { root.other = 1; } export default root;`,
  ],
  [
    'shadowed CommonJS names',
    `const root = ${factory}; function run(module, exports) { module.exports = {}; exports.other = 1; } export default root;`,
  ],
  [
    'instance operations',
    `const root = ${factory}; function read() { root.service.check(); } export default root;`,
  ],
  [
    'helper definitions and values',
    `const root = defineService('Example', create, { helper() {}, flag: true, literal: 'value' }); export default root;`,
  ],
] as const;
for (const [name, code] of valid) {
  test(`accepts ${name}`, () => {
    const result = lint(prefix + code);
    assert.equal(result.status, 0, JSON.stringify(result.diagnostics));
    assert.deepEqual(result.diagnostics, []);
  });
}

test('accepts an aliased kernel import', () => {
  const result = lint(
    `import { defineService as managed } from '${helperImport}'; export default managed('Example', create);`,
  );
  assert.equal(result.status, 0, JSON.stringify(result.diagnostics));
});

const rejected = [
  ['named function', `export function helper() {} export default ${factory};`, 'runtimeExport'],
  [
    'named re-export',
    `export { helper } from './actions'; export default ${factory};`,
    'runtimeExport',
  ],
  ['wildcard export', `export * from './actions'; export default ${factory};`, 'runtimeExport'],
  ['default class', 'export default class Example {}', 'defaultExport'],
  ['missing default', 'const root = ' + factory, 'defaultExport'],
  ['hand-written initializer', 'export default { init() {}, service: {} };', 'defaultExport'],
  ['spread initializer', `export default { ...${factory}, extras: {} };`, 'defaultExport'],
  [
    'runtime extras factory',
    `export default defineService('Example', create, getExtras());`,
    'explicitExtras',
  ],
  ['spread extras', `export default defineService('Example', create, { ...helpers });`, 'property'],
  [
    'computed extra',
    `export default defineService('Example', create, { [name]: helper });`,
    'property',
  ],
  [
    'duplicate extra',
    `export default defineService('Example', create, { helper, helper });`,
    'duplicate',
  ],
  [
    'import-time extra invocation',
    `export default defineService('Example', create, { start: schedule() });`,
    'value',
  ],
  [
    'extra instance on import',
    `export default defineService('Example', create, { other: new Service() });`,
    'value',
  ],
  [
    'root extension',
    `const root = ${factory}; Object.assign(root, { other: helper }); export default root;`,
    'escape',
  ],
  [
    'root override through alias',
    `const root = ${factory}; const alias = root; alias.init = helper; export default root;`,
    'mutation',
  ],
  [
    'root property deletion',
    `const root = ${factory}; delete root.service; export default root;`,
    'mutation',
  ],
  ['circular aliases', `const a = b; const b = a; export default a;`, 'alias'],
  [
    'wrapped extra invocation',
    `export default defineService('Example', create, { start: (schedule()) as unknown });`,
    'value',
  ],
  [
    'conditional extra invocation',
    `export default defineService('Example', create, { start: enabled ? schedule() : helper });`,
    'value',
  ],
  [
    'root override with a cast',
    `const root = ${factory}; (root as unknown).init = helper; export default root;`,
    'mutation',
  ],
  [
    'CommonJS named export',
    `const root = ${factory}; exports.helper = helper; export default root;`,
    'mutation',
  ],
  [
    'CommonJS replacement',
    `const root = ${factory}; module.exports = { default: root, helper }; export default root;`,
    'mutation',
  ],
  [
    'CommonJS extension',
    `const root = ${factory}; Object.assign(module.exports, { helper }); export default root;`,
    'escape',
  ],
  [
    'extras extension',
    `const extras = { helper }; const root = defineService('Example', create, extras); Object.assign(extras, { other }); export default root;`,
    'escape',
  ],
  [
    'nested extras extension',
    `const root = defineService('Example', create, { helper }); Object.assign(root.extras, { other }); export default root;`,
    'escape',
  ],
] as const;
const messages: Record<string, RegExp> = {
  runtimeExport: /Named runtime exports/,
  defaultExport: /Export a default initializer/,
  alias: /resolve to local const/,
  explicitExtras: /explicit object/,
  property: /static names/,
  duplicate: /each extra once/,
  value: /helper references/,
  escape: /declare helpers through extras/,
  mutation: /Do not add, override or remove/,
};
for (const [name, code, messageId] of rejected) {
  test(`rejects ${name}`, () => {
    const result = lint(prefix + code);
    assert.equal(result.status, 1, JSON.stringify(result.diagnostics));
    assert.equal(result.diagnostics.length, 1);
    assert.equal(result.diagnostics[0]?.code, 'ghost(service-root-shape)');
    assert.equal(result.diagnostics[0]?.severity, 'error');
    assert.match(result.diagnostics[0]?.message ?? '', messages[messageId]!);
  });
}

test('rejects a lookalike helper imported from another module', () => {
  const result = lint(`import { defineService } from './other'; export default ${factory};`);
  assert.equal(result.status, 1);
  assert.match(result.diagnostics[0]?.message ?? '', messages.defaultExport!);
});

test('rejects extras alias mutations, updates and spread arguments', () => {
  for (const [code, message] of [
    [
      `const root = defineService('Example', create, { helper }); const extras = root.extras; extras.other = helper; export default root;`,
      /Do not add/,
    ],
    [`const root = ${factory}; root['init']++; export default root;`, /Do not add/],
    [`export default defineService(...args);`, /Use defineService/],
  ] as const) {
    const result = lint(prefix + code);
    assert.equal(result.status, 1);
    assert.equal(result.diagnostics.length, 1);
    assert.match(result.diagnostics[0]?.message ?? '', message);
  }
});

for (const kind of ['const', 'let', 'var']) {
  for (const local of [false, true]) {
    test(`rejects mutations through ${local ? 'function-local' : 'top-level'} ${kind} aliases`, () => {
      for (const target of ['root', 'extras']) {
        const declarations = `const extras = { helper }; const root = defineService('Example', create, extras);`;
        const mutation = `${kind} first = ${target}; ${kind} second = first; second.other = helper;`;
        const code =
          prefix +
          declarations +
          (local ? `function run() { ${mutation} }` : mutation) +
          'export default root;';
        const result = lint(code);
        assert.equal(result.status, 1, JSON.stringify(result.diagnostics));
        assert.equal(result.diagnostics.length, 1);
        assert.match(result.diagnostics[0]?.message ?? '', messages.mutation!);
      }
    });
  }
}

test('rejects mutations through an alias assigned after its declaration', () => {
  const result = lint(
    prefix +
      `const root = ${factory}; let alias; alias = root; alias.other = helper; export default root;`,
  );
  assert.equal(result.status, 1);
  assert.equal(result.diagnostics.length, 1);
  assert.match(result.diagnostics[0]?.message ?? '', messages.mutation!);
});

for (const value of ['config.value', "config['value']", 'config?.value']) {
  test(`rejects import-time extras member access: ${value}`, () => {
    const result = lint(
      prefix +
        `const config = { get value() { return helper; } }; export default defineService('Example', create, { helper: ${value} });`,
    );
    assert.equal(result.status, 1);
    assert.equal(result.diagnostics.length, 1);
    assert.match(result.diagnostics[0]?.message ?? '', messages.value!);
  });
}

test('allows deferred extras member access inside a helper', () => {
  const result = lint(
    prefix + `export default defineService('Example', create, { helper: () => config.value });`,
  );
  assert.equal(result.status, 0, JSON.stringify(result.diagnostics));
});

test('reports the offending export position and supports Oxlint inline exceptions', () => {
  const source = prefix + `export default ${factory};\nexport const other = true;`;
  const result = lint(source);
  assert.equal(result.diagnostics[0]?.labels[0]?.span.line, 3);
  assert.equal(result.diagnostics[0]?.labels[0]?.span.column, 1);
  assert.equal(
    lint(
      prefix +
        `export default ${factory};\n// oxlint-disable-next-line ${ruleName}\nexport const other = true;`,
    ).status,
    0,
  );
});

test('does not enforce migrated shape on legacy roots or implementation files', () => {
  for (const filename of [
    'ghost/core/server/services/explore/index.ts',
    'ghost/core/server/services/app-installations/implementation.ts',
    'ghost/test/example.ts',
    'apps/admin/example.ts',
  ]) {
    assert.equal(lint('export const ordinary = true;', filename).status, 0, filename);
  }
});

test('configured roots match the inventory migration markers exactly', () => {
  const inventory = yaml.load(
    readFileSync(path.join(root, 'ghost/core/server/services/service-inventory.yaml'), 'utf8'),
  ) as {
    services: Record<string, { migrated?: boolean; kind: string }>;
  };
  for (const override of config.overrides) {
    const settings = override.rules[ruleName];
    if (!settings) {
      continue;
    }
    assert.equal(settings[0], 'error');
    for (const file of override.files) {
      const expectedImport = path
        .relative(path.dirname(file), 'ghost/core/kernel/define-service')
        .split(path.sep)
        .join('/');
      assert.equal(settings[1].helperImport, expectedImport, file);
    }
  }
  const actual = config.overrides
    .filter((override: { rules: Record<string, unknown> }) => override.rules[ruleName])
    .flatMap((override: { files: string[] }) => override.files)
    .sort();
  const expected = Object.entries(inventory.services)
    .filter(([, service]) => service.migrated)
    .map(
      ([name, service]) =>
        `ghost/core/server/services/${service.kind === 'directory' ? `${name}/index.ts` : name}`,
    )
    .sort();
  assert.deepEqual(actual, expected, 'Update Oxlint scope when marking a service migrated');
});
