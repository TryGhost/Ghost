import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it, type TestContext } from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import type { ICruiseResult } from 'dependency-cruiser';
import ts from 'typescript';
import {
  assertMigratedServiceSources,
  findComputedServiceImports,
  getServiceDependencyOptions,
  readServiceInventory,
  serviceDependencyResolveOptions,
  serviceDependencyRules,
  serviceMigrationRules,
  SERVICES_ROOT,
  type ServiceInventory,
} from '../lib/service-dependencies.ts';

const migrated = { kind: 'directory', disposition: 'retain', migrated: true } as const;
const legacy = { kind: 'directory', disposition: 'retain' } as const;
const run = promisify(execFile);
const cruiser = import.meta.resolve('dependency-cruiser');
const repository = path.resolve(import.meta.dirname, '../../..');
const service = `${SERVICES_ROOT}/alpha`;
const rootSource = `
  import { defineService } from '../../../kernel/define-service';
  export default defineService('Alpha', () => ({}));
`;

function fixture(
  t: TestContext,
  files: Record<string, string> = {},
  inventory: ServiceInventory = { alpha: migrated },
) {
  const root = mkdtempSync(path.join(tmpdir(), 'ghost-service-dependencies-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file: string, source: string) => {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, source);
  };
  for (const [file, source] of Object.entries({
    'package.json': '{"private":true,"type":"commonjs"}',
    [`${SERVICES_ROOT}/service-inventory.yaml`]: JSON.stringify({ services: inventory }),
    'ghost/core/kernel/define-service.ts':
      'export function defineService(name, create) { return {name, create}; }',
    'ghost/core/shared/config.ts':
      'export default {get: () => undefined}; export interface Config {}',
    [`${service}/index.ts`]: rootSource,
    ...files,
  })) {
    write(file, source);
  }
  const services = readServiceInventory(root);
  return {
    root,
    services,
    write,
    async inspect(scope: 'all' | 'migrated' = 'migrated') {
      const migration = serviceMigrationRules(services);
      // The cruiser captures cwd on import; start it inside each fixture so its
      // resolved paths have the same repository-relative shape as the real CLI.
      const { stdout } = await run(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
        import { cruise } from ${JSON.stringify(cruiser)};
        const config = ${JSON.stringify({
          options: { ...getServiceDependencyOptions(root), tsPreCompilationDeps: false },
          forbidden: [...serviceDependencyRules(services, scope), ...migration.forbidden],
          required: migration.required,
        })};
        const result = await cruise([${JSON.stringify(SERVICES_ROOT)}], {
          ...config.options,
          outputType: 'json', validate: true, ruleSet: config,
        }, ${JSON.stringify(serviceDependencyResolveOptions)});
        process.stdout.write(result.output);
      `,
        ],
        { cwd: root },
      );
      const graph: ICruiseResult = JSON.parse(stdout);
      assert.ok(
        graph.modules.some(({ source }) => source === `${service}/index.ts`),
        'The fixture service root must be analyzed',
      );
      return graph.summary.violations;
    },
  };
}

function repositoryFixture(
  t: TestContext,
  files: Record<string, string>,
  inventory: ServiceInventory = { alpha: migrated },
) {
  const f = fixture(t, files, inventory);
  f.write(
    '.dependency-cruiser.cjs',
    readFileSync(path.join(repository, '.dependency-cruiser.cjs'), 'utf8'),
  );
  for (const name of ['service-dependencies.ts', 'service-dependency-resolver.mjs']) {
    const file = `tools/scripts/lib/${name}`;
    mkdirSync(path.join(f.root, path.dirname(file)), { recursive: true });
    symlinkSync(path.join(repository, file), path.join(f.root, file));
  }
  return {
    ...f,
    inspectRepository() {
      // Exercise the CLI's webpackConfig hook, not an independently configured resolver.
      const result = spawnSync(
        process.execPath,
        [
          fileURLToPath(new URL('../../bin/dependency-cruise.mjs', cruiser)),
          SERVICES_ROOT,
          '--config',
          '.dependency-cruiser.cjs',
          '--output-type',
          'json',
        ],
        { cwd: f.root, encoding: 'utf8' },
      );
      assert.ifError(result.error);
      assert.ok(result.status === 0 || result.status === 1, result.stderr);
      const graph: ICruiseResult = JSON.parse(result.stdout);
      assert.ok(graph.modules.some(({ source }) => source === `${service}/index.ts`));
      return graph;
    },
  };
}

function packageFiles(name: string): Record<string, string> {
  const base = `node_modules/${name}`;
  return {
    [`${base}/package.json`]: JSON.stringify({
      name,
      version: '1.0.0',
      main: 'index.js',
      exports: { '.': './index.js', './private': './private.js' },
    }),
    [`${base}/index.js`]: 'module.exports = {};',
    [`${base}/private.js`]: 'module.exports = {};',
  };
}

it('allows private implementation modules, installed libraries, contracts and wiring in the actual root', async (t) => {
  const f = fixture(t, {
    ...packageFiles('@tryghost/errors'),
    ...packageFiles('@tryghost/tpl'),
    [`${service}/index.ts`]: `${rootSource}\nimport config from '../../../shared/config'; export {config};`,
    [`${service}/implementation.ts`]: `
      import './nested/helper';
      import errors from '@tryghost/errors';
      import tpl from '@tryghost/tpl';
      import { randomUUID } from 'node:crypto';
      import type { Config } from '../../../shared/config';
      export type { Config } from '../../../shared/config';
      export interface Dependencies { config: Config }
      export { errors, tpl };
      export const makeId = () => randomUUID();
    `,
    [`${service}/nested/helper.ts`]: 'export const helper = true;',
  });
  assert.doesNotThrow(() => assertMigratedServiceSources(f.root, f.services));
  assert.deepEqual(await f.inspect(), []);
});

it('blocks application dependencies through require, static import, dynamic import and re-export', async (t) => {
  const imports = {
    'require.ts': "const config = require('../../../shared/config');",
    'static.ts': "import config from '../../../shared/config'; export {config};",
    'dynamic.ts': "export const load = () => import('../../../shared/config');",
    'reexport.ts': "export {default} from '../../../shared/config';",
  };
  const f = fixture(
    t,
    Object.fromEntries(
      Object.entries(imports).map(([file, source]) => [`${service}/${file}`, source]),
    ),
  );
  const violations = await f.inspect();
  assert.deepEqual(
    violations
      .filter(({ rule }) => rule.name === 'service-deps-alpha')
      .map(({ from }) => from)
      .sort(),
    Object.keys(imports)
      .map((file) => `${service}/${file}`)
      .sort(),
  );
  assert.ok(violations.every(({ to }) => to === 'ghost/core/shared/config.ts'));
});

it('does not exempt a nested index or treat a service with a shared prefix as private implementation', async (t) => {
  const f = fixture(
    t,
    {
      [`${service}/nested/index.ts`]: "import '../../../../shared/config';",
      [`${service}/implementation.ts`]: "import '../alpha-extra/helper';",
      [`${SERVICES_ROOT}/alpha-extra/helper.ts`]: 'export const helper = true;',
    },
    { alpha: migrated, 'alpha-extra': legacy },
  );
  const violations = await f.inspect();
  assert.deepEqual(violations.map(({ from, to }) => [from, to]).sort(), [
    [`${service}/implementation.ts`, `${SERVICES_ROOT}/alpha-extra/helper.ts`],
    [`${service}/nested/index.ts`, 'ghost/core/shared/config.ts'],
  ]);
});

it('blocks implementations from looking up their own wiring root', async (t) => {
  const f = fixture(t, {
    [`${service}/implementation.ts`]: "import alpha from './index'; export {alpha};",
  });
  const violations = await f.inspect();
  assert.deepEqual(
    violations.map(({ rule, from, to }) => ({ name: rule.name, from, to })),
    [
      {
        name: 'service-deps-own-root-alpha',
        from: `${service}/implementation.ts`,
        to: `${service}/index.ts`,
      },
    ],
  );
});

it('checks resolved package identities instead of accepting similar package names', async (t) => {
  const f = fixture(t, {
    ...packageFiles('@tryghost/errors'),
    ...packageFiles('@tryghost/errors-extra'),
    ...packageFiles('@tryghost/logging'),
    [`${service}/implementation.ts`]: `
      import '@tryghost/errors';
      import '@tryghost/errors/private';
      import '@tryghost/errors-extra';
      import '@tryghost/logging';
    `,
  });
  assert.deepEqual((await f.inspect()).map(({ to }) => to).sort(), [
    'node_modules/@tryghost/errors-extra/index.js',
    'node_modules/@tryghost/logging/index.js',
  ]);
});

it('fails closed when an allowed library name cannot be resolved', async (t) => {
  const f = fixture(t, { [`${service}/implementation.ts`]: "import '@tryghost/errors';" });
  assert.ok(
    (await f.inspect()).some(
      ({ rule, to }) => rule.name === 'service-deps-unresolved-alpha' && to === '@tryghost/errors',
    ),
  );
});

it('allows an explicit shared library file without opening its surrounding directory', async (t) => {
  const f = fixture(t, {
    'ghost/core/server/lib/db-types/date.ts': 'export const date = true;',
    'ghost/core/server/lib/db-types/other.ts': 'export const other = true;',
    [`${service}/implementation.ts`]:
      "import '../../lib/db-types/date'; import '../../lib/db-types/other';",
  });
  assert.deepEqual(
    (await f.inspect()).map(({ to }) => to),
    ['ghost/core/server/lib/db-types/other.ts'],
  );
});

it('requires migration markers for listed and unlisted roots that import defineService', async (t) => {
  const f = fixture(t, { [`${SERVICES_ROOT}/unlisted/index.ts`]: rootSource }, { alpha: legacy });
  assert.deepEqual(
    (await f.inspect())
      .map(({ rule, from }) => ({ name: rule.name, from }))
      .sort((a, b) => a.from.localeCompare(b.from)),
    [
      { name: 'service-initializer-needs-migration-marker', from: `${service}/index.ts` },
      {
        name: 'service-initializer-needs-migration-marker',
        from: `${SERVICES_ROOT}/unlisted/index.ts`,
      },
    ],
  );
});

it('requires migrated roots to import the real initializer, not a same-named local function', async (t) => {
  const f = fixture(t, {
    [`${service}/index.ts`]:
      "import {defineService} from './pretend'; export default defineService();",
    [`${service}/pretend.ts`]: 'export function defineService() { return {}; }',
  });
  assert.ok(
    (await f.inspect()).some(
      ({ from, rule }) =>
        from === `${service}/index.ts` &&
        rule.name.startsWith('migrated-service-needs-initializer-'),
    ),
  );
});

it('does not let a type-only initializer import satisfy a migrated root', async (t) => {
  const f = fixture(t, {
    [`${service}/index.ts`]:
      "import type {defineService} from '../../../kernel/define-service'; export type Initializer = typeof defineService;",
  });
  assert.ok(
    (await f.inspect()).some(
      ({ from, rule }) =>
        from === `${service}/index.ts` &&
        rule.name.startsWith('migrated-service-needs-initializer-'),
    ),
  );
});

it('rejects missing TypeScript roots and file entries marked migrated', (t) => {
  const f = fixture(t);
  rmSync(path.join(f.root, service, 'index.ts'));
  f.write(`${service}/index.js`, 'module.exports = {};');
  assert.throws(() => assertMigratedServiceSources(f.root, f.services), /Alpha|alpha/);
  assert.throws(
    () =>
      assertMigratedServiceSources(f.root, {
        'standalone.ts': { kind: 'file', disposition: 'retain', migrated: true },
      }),
    /standalone\.ts/,
  );
});

it('enforces migrated services while the all-services audit also sees legacy dependencies', async (t) => {
  const f = fixture(
    t,
    {
      [`${SERVICES_ROOT}/legacy/index.js`]: 'module.exports = {};',
      [`${SERVICES_ROOT}/legacy/implementation.js`]:
        "module.exports = require('../../../shared/config');",
    },
    { alpha: migrated, legacy },
  );
  assert.deepEqual(await f.inspect(), []);
  assert.deepEqual(
    (await f.inspect('all')).map(({ from, to }) => [from, to]),
    [[`${SERVICES_ROOT}/legacy/implementation.js`, 'ghost/core/shared/config.ts']],
  );
});

it('rejects computed loaders in implementations while allowing them in the wiring root', (t) => {
  const f = fixture(t, {
    [`${service}/index.ts`]: `${rootSource}\nconst target = './implementation'; require(target);`,
    [`${service}/implementation.ts`]: "const target = '../other'; require(target); import(target);",
    [`${service}/nested/index.ts`]: "const target = '../other'; require(target);",
  });
  assert.equal(findComputedServiceImports(f.root, f.services, 'migrated').length, 4);
  assert.throws(() => assertMigratedServiceSources(f.root, f.services), /implementation\.ts:1/);
  assert.throws(() => assertMigratedServiceSources(f.root, f.services), /nested\/index\.ts:1/);
  f.write(`${service}/implementation.ts`, "require('./nested/index'); import(`./nested/index`);");
  f.write(`${service}/nested/index.ts`, 'export {};');
  assert.doesNotThrow(() => assertMigratedServiceSources(f.root, f.services));
});

it('enforces the repository policy and invalidates boundary and regression caches when it changes', async (t) => {
  const f = repositoryFixture(t, {
    [`${service}/implementation.ts`]: "import '../../../shared/config';",
  });
  const helper = 'tools/scripts/lib/service-dependencies.ts';
  assert.ok(
    f
      .inspectRepository()
      .summary.violations.some(
        ({ from, to, rule }) =>
          from === `${service}/implementation.ts` &&
          to === 'ghost/core/shared/config.ts' &&
          rule.name === 'service-deps-alpha',
      ),
  );

  const manifest = JSON.parse(readFileSync(path.join(repository, 'package.json'), 'utf8')) as {
    nx: { targets: { 'lint:boundaries': { inputs: string[] } } };
  };
  const inputs = manifest.nx.targets['lint:boundaries'].inputs;
  assert.ok(
    inputs.includes(`{workspaceRoot}/${helper}`),
    'Policy changes must invalidate cached boundary checks',
  );
  assert.ok(
    inputs.includes('{workspaceRoot}/tools/scripts/lib/service-dependency-resolver.mjs'),
    'Resolver changes must invalidate cached boundary checks',
  );
  assert.ok(
    inputs.includes('{workspaceRoot}/ghost/core/**/*'),
    'Inventory and migrated source changes must invalidate cached boundary checks',
  );

  const scripts = JSON.parse(
    readFileSync(path.join(repository, 'tools/scripts/package.json'), 'utf8'),
  ) as {
    nx: {
      namedInputs: { serviceDependencyContracts: string[] };
      targets: Record<'test' | 'test:unit', { inputs: unknown[] }>;
    };
  };
  assert.ok(
    scripts.nx.namedInputs.serviceDependencyContracts.includes(
      '{workspaceRoot}/.dependency-cruiser.cjs',
    ),
    'The repository configuration exercised by the regression must be a test input',
  );
  for (const target of ['test', 'test:unit'] as const) {
    assert.ok(
      scripts.nx.targets[target].inputs.includes('serviceDependencyContracts'),
      `Policy configuration changes must invalidate cached ${target} regressions`,
    );
  }
});

it('follows implementation helpers in nested test folders with the actual repository configuration', (t) => {
  const f = repositoryFixture(t, {
    [`${service}/implementation.ts`]: "import './test/helper';",
    [`${service}/test/helper.ts`]: "import '../../../../shared/config';",
  });
  const graph = f.inspectRepository();
  assert.deepEqual(
    graph.modules
      .find(({ source }) => source === `${service}/implementation.ts`)
      ?.dependencies.map(({ resolved }) => resolved),
    [`${service}/test/helper.ts`],
  );
  assert.deepEqual(
    graph.summary.violations.map(({ rule, from, to }) => [rule.name, from, to]),
    [['service-deps-alpha', `${service}/test/helper.ts`, 'ghost/core/shared/config.ts']],
  );
});

it('preserves source edges and violations after adjacent TypeScript emission through the real CLI', (t) => {
  const sources = {
    'ghost/core/kernel/define-service.ts':
      'export function defineService(name, create) { return {name, create}; }',
    'ghost/core/shared/config.ts': 'export const configured = true;',
    [`${service}/index.ts`]: rootSource.replace("define-service'", "define-service.js'"),
    [`${service}/implementation.ts`]:
      "import '../../../shared/config.js'; import './index.js'; import './helper.js';",
    [`${service}/helper.ts`]: 'export const helper = true;',
    [`${SERVICES_ROOT}/unmarked/index.ts`]: rootSource,
  };
  const f = repositoryFixture(
    t,
    {
      ...sources,
      [`${service}/authored.js`]: "require('../../../shared/config.js');",
    },
    { alpha: migrated, unmarked: legacy },
  );
  const graphBefore = f.inspectRepository();
  const edges = (graph: ICruiseResult) =>
    graph.modules
      .flatMap(({ source, dependencies }) =>
        dependencies.map(({ module, resolved }) => [source, module, resolved]),
      )
      .sort();
  const violations = (graph: ICruiseResult) =>
    graph.summary.violations.map(({ rule, from, to }) => [rule.name, from, to]).sort();
  assert.deepEqual(
    violations(graphBefore),
    [
      ['service-deps-alpha', `${service}/authored.js`, 'ghost/core/shared/config.ts'],
      ['service-deps-alpha', `${service}/implementation.ts`, 'ghost/core/shared/config.ts'],
      ['service-deps-own-root-alpha', `${service}/implementation.ts`, `${service}/index.ts`],
      [
        'service-initializer-needs-migration-marker',
        `${SERVICES_ROOT}/unmarked/index.ts`,
        'ghost/core/kernel/define-service.ts',
      ],
    ].sort(),
  );
  assert.ok(
    edges(graphBefore).some(
      ([source, specifier, resolved]) =>
        source === `${service}/implementation.ts` &&
        specifier === './helper.js' &&
        resolved === `${service}/helper.ts`,
    ),
  );
  for (const [file, source] of Object.entries(sources)) {
    const compiled = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        sourceMap: true,
      },
    });
    f.write(file.replace(/\.ts$/, '.js'), compiled.outputText);
    assert.ok(compiled.sourceMapText);
    f.write(file.replace(/\.ts$/, '.js.map'), compiled.sourceMapText);
  }
  const graphAfter = f.inspectRepository();
  assert.deepEqual(edges(graphAfter), edges(graphBefore));
  assert.deepEqual(violations(graphAfter), violations(graphBefore));
  assert.ok(graphAfter.modules.some(({ source }) => source === `${service}/authored.js`));
  assert.ok(!graphAfter.modules.some(({ source }) => source === `${service}/implementation.js`));
});
