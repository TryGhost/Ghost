import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { ICruiseResult } from 'dependency-cruiser';
import ts from 'typescript';

const repository = path.resolve(import.meta.dirname, '../../..');
const services = 'ghost/core/server/services';
const alpha = `${services}/alpha`;
const config = 'ghost/core/shared/config.ts';
const resolver = 'tools/scripts/ci/service-dependency-resolver.mjs';
const cli = fileURLToPath(
  new URL('../../bin/dependency-cruise.mjs', import.meta.resolve('dependency-cruiser')),
);

function fixture(t: TestContext, files: Record<string, string>) {
  const root = mkdtempSync(path.join(tmpdir(), 'ghost-service-boundaries-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file: string, source: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), source);
  };
  for (const [file, source] of Object.entries({
    'package.json': '{"private":true,"type":"commonjs"}',
    '.dependency-cruiser.cjs': readFileSync(
      path.join(repository, '.dependency-cruiser.cjs'),
      'utf8',
    ),
    [`${services}/service-inventory.yaml`]: JSON.stringify({
      services: {
        alpha: { kind: 'directory', disposition: 'retain', migrated: true },
        legacy: { kind: 'directory', disposition: 'retain' },
      },
    }),
    [config]: 'export const enabled = true; export interface Config {}',
    ...files,
  })) {
    write(file, source);
  }
  for (const file of [resolver, 'node_modules/js-yaml']) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    symlinkSync(path.join(repository, file), path.join(root, file));
  }
  const run = (output = 'json', audit = false, input = services) => {
    const result = spawnSync(
      process.execPath,
      [cli, input, '--config', '.dependency-cruiser.cjs', '--output-type', output],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, GHOST_SERVICE_DEPENDENCY_AUDIT: audit ? '1' : '' },
      },
    );
    assert.ifError(result.error);
    assert.notEqual(result.status, null, result.stderr);
    return result;
  };
  return {
    write,
    run,
    link(source: string, destination: string) {
      mkdirSync(path.dirname(path.join(root, destination)), { recursive: true });
      symlinkSync(path.join(root, source), path.join(root, destination));
    },
    graph(audit = false, input = services): ICruiseResult {
      const result = run('json', audit, input);
      assert.equal(result.status, 0, result.stderr);
      const graph: ICruiseResult = JSON.parse(result.stdout);
      assert.ok(graph.modules.length > 0, 'The fixture must actually be analyzed');
      return graph;
    },
  };
}

const violations = (graph: ICruiseResult) =>
  graph.summary.violations.map(({ rule, from, to }) => [rule.name, from, to]).sort();
const edges = (graph: ICruiseResult) =>
  graph.modules
    .flatMap(({ source, dependencies }) =>
      dependencies.map(({ module, resolved }) => [source, module, resolved]),
    )
    .sort();

it('enforces migrated services and reports all services through native Markdown and JSON audit output', (t) => {
  const f = fixture(t, {
    [`${alpha}/implementation.ts`]: "import '../../../shared/config';",
    [`${alpha}/index.js`]: "require('../../../shared/config');",
    [`${services}/legacy/implementation.js`]: "require('../../../shared/config');",
    [`${services}/legacy/index.js`]: "require('../../../shared/config');",
    [`${services}/unlisted/helper.ts`]: "import '../../../shared/config';",
    [`${services}/unlisted.ts`]: "import '../../shared/config';",
  });
  assert.deepEqual(
    violations(f.graph()).map(([, from]) => from),
    [`${alpha}/implementation.ts`, `${alpha}/index.js`],
  );
  assert.equal(f.run('err').status, 2, 'The native error reporter returns the violation count');
  const audit = f.graph(true);
  assert.deepEqual(
    violations(audit).map(([, from]) => from),
    [
      `${alpha}/implementation.ts`,
      `${services}/legacy/implementation.js`,
      `${services}/unlisted.ts`,
      `${services}/unlisted/helper.ts`,
    ].sort(),
  );
  const markdown = f.run('markdown', true);
  assert.equal(markdown.status, 0);
  assert.ok(markdown.stdout.includes(`${services}/unlisted/helper.ts`));
  assert.ok(markdown.stdout.includes('service-dependencies'));
  for (const migrated of [false, true]) {
    f.write(
      `${services}/service-inventory.yaml`,
      JSON.stringify({
        services: {
          alpha: { kind: 'directory', disposition: 'retain' },
          legacy: {
            kind: 'directory',
            disposition: 'retain',
            ...(migrated ? { migrated: true } : {}),
          },
        },
      }),
    );
    assert.deepEqual(
      violations(f.graph()).map(([, from]) => from),
      migrated ? [`${services}/legacy/implementation.js`, `${services}/legacy/index.js`] : [],
    );
    if (!migrated) {
      assert.equal(f.run('err').status, 0, 'An empty migration set leaves legacy services alone');
    }
  }
});

it('allows same-service code, explicit types, approved libraries and root wiring', (t) => {
  const f = fixture(t, {
    [`${alpha}/index.ts`]: "import '../../../shared/config';",
    [`${alpha}/helper.ts`]: 'export const helper = true;',
    'ghost/core/server/lib/db-types/date.ts': 'export const date = true;',
    'ghost/core/server/lib/db-types/boolean.ts': 'export const boolean = true;',
    'ghost/core/server/lib/db-types/json.ts': 'export const json = true;',
    'ghost/core/kernel/clock.ts': 'export const getUnixTime = () => 0; export const moment = {};',
    'ghost/core/server/lib/public-jwk.ts': 'export const key = true;',
    [`${services}/jobs-service/job.ts`]: 'export class Job {}',
    [`${alpha}/implementation.ts`]: `
      import './helper'; import type {Config} from '../../../shared/config';
      export type {Config} from '../../../shared/config';
      import '@tryghost/errors'; import '@tryghost/errors/detail'; import '@tryghost/tpl'; import '@tryghost/security'; import 'zod';
      import 'node:crypto'; import 'util'; import 'bson-objectid';
      import '../../lib/db-types/date'; import '../../lib/db-types/boolean'; import '../../lib/db-types/json';
      import '../../lib/public-jwk'; import '../jobs-service/job';
      import {getUnixTime, moment} from '../../../kernel/clock';
    `,
  });
  for (const name of [
    '@tryghost/errors',
    '@tryghost/tpl',
    '@tryghost/security',
    'zod',
    'bson-objectid',
  ]) {
    f.write(
      `node_modules/${name}/package.json`,
      JSON.stringify({
        name,
        main: 'index.js',
        exports: { '.': './index.js', './detail': './detail.js' },
      }),
    );
    f.write(`node_modules/${name}/index.js`, 'module.exports = {};');
    f.write(`node_modules/${name}/detail.js`, 'module.exports = {};');
  }
  assert.deepEqual(violations(f.graph()), []);
  assert.equal(f.run('err').status, 0);
});

it('allows the exact libraries required by Member Attribution without allowing siblings', (t) => {
  const approved = [
    '@tryghost/string',
    '@tryghost/string/lib/index',
    '@tryghost/referrer-parser',
    '@tryghost/referrer-parser/dist/index.cjs',
    '@tryghost/referrer-parser/dist/index.js',
    '../../lib/common/to-plain',
    '../../lib/link-replacer',
  ];
  const rejected = [
    '@tryghost/string/other',
    '@tryghost/referrer-parser/other',
    '@tryghost/string-extra',
    '@tryghost/referrer-parser-extra',
    '../../lib/common/to-plain-extra',
    '../../lib/link-replacer-extra',
  ];
  const f = fixture(t, {
    [`${alpha}/approved.js`]: approved.map((name) => `require('${name}');`).join('\n'),
    [`${alpha}/rejected.ts`]: rejected.map((name) => `import '${name}';`).join('\n'),
    'ghost/core/server/lib/common/to-plain.ts': 'export const toPlain = (value) => value;',
    'ghost/core/server/lib/link-replacer.js': 'module.exports = {};',
    'ghost/core/server/lib/common/to-plain-extra.ts': 'export {};',
    'ghost/core/server/lib/link-replacer-extra.js': 'module.exports = {};',
  });
  for (const [name, main] of [
    ['@tryghost/string', 'lib/index.js'],
    ['@tryghost/referrer-parser', 'dist/index.cjs'],
    ['@tryghost/string-extra', 'index.js'],
    ['@tryghost/referrer-parser-extra', 'index.js'],
  ]) {
    f.write(`node_modules/${name}/package.json`, JSON.stringify({ name, main }));
    f.write(`node_modules/${name}/${main}`, 'module.exports = {};');
    f.write(`node_modules/${name}/other.js`, 'module.exports = {};');
  }
  f.write('node_modules/@tryghost/referrer-parser/dist/index.js', 'module.exports = {};');
  const graph = f.graph();
  assert.equal(
    edges(graph).filter(([from]) => from === `${alpha}/approved.js`).length,
    approved.length,
  );
  assert.deepEqual(
    violations(graph),
    [
      'node_modules/@tryghost/string/other.js',
      'node_modules/@tryghost/referrer-parser/other.js',
      'node_modules/@tryghost/string-extra/index.js',
      'node_modules/@tryghost/referrer-parser-extra/index.js',
      'ghost/core/server/lib/common/to-plain-extra.ts',
      'ghost/core/server/lib/link-replacer-extra.js',
    ]
      .map((to) => ['service-dependencies', `${alpha}/rejected.ts`, to])
      .sort(),
  );
});

it('rejects outside dependencies, own roots and unresolved imports without folder or package-prefix escapes', (t) => {
  const imports = {
    'require.ts': "require('../../../shared/config');",
    'static.ts': "import '../../../shared/config';",
    'dynamic.ts': "import('../../../shared/config');",
    'reexport.ts': "export {enabled} from '../../../shared/config';",
    'nested/index.ts': "import '../../../../shared/config';",
    'test/helper.ts': "import '../../../../shared/config';",
    'build/helper.ts': "import '../../../../shared/config';",
    'built/helper.ts': "import '../../../../shared/config';",
    'dist/helper.ts': "import '../../../../shared/config';",
    'sibling.ts': "import '../alpha-extra/helper';",
    'package.ts': "import '@tryghost/errors-extra';",
    'security-package.ts': "import '@tryghost/security-extra';",
    'shared.ts': "import '../../lib/db-types/other';",
    'kernel.ts': "import '../../../kernel/clock-extra';",
  };
  const f = fixture(t, {
    ...Object.fromEntries(
      Object.entries(imports).map(([file, source]) => [`${alpha}/${file}`, source]),
    ),
    [`${alpha}/index.ts`]: 'export {};',
    [`${alpha}/own.ts`]: "import './index';",
    [`${alpha}/missing.ts`]: "import '@tryghost/tpl';",
    [`${alpha}/implementation.ts`]: "import './test/helper';",
    [`${services}/alpha-extra/helper.ts`]: 'export {};',
    'ghost/core/server/lib/db-types/other.ts': 'export {};',
    'ghost/core/kernel/clock-extra.ts': 'export {};',
    'node_modules/@tryghost/errors-extra/package.json': '{"main":"index.js"}',
    'node_modules/@tryghost/errors-extra/index.js': 'module.exports = {};',
    'node_modules/@tryghost/security-extra/package.json': '{"main":"index.js"}',
    'node_modules/@tryghost/security-extra/index.js': 'module.exports = {};',
  });
  const graph = f.graph();
  assert.deepEqual(
    graph.summary.violations
      .filter(({ rule }) => rule.name === 'service-dependencies')
      .map(({ from }) => from)
      .sort(),
    Object.keys(imports)
      .map((file) => `${alpha}/${file}`)
      .sort(),
  );
  assert.ok(
    violations(graph).some(
      ([rule, from, to]) =>
        rule === 'service-own-root' && from === `${alpha}/own.ts` && to === `${alpha}/index.ts`,
    ),
  );
  assert.ok(
    violations(graph).some(
      ([rule, from]) => rule === 'service-unresolved' && from === `${alpha}/missing.ts`,
    ),
  );
  assert.ok(
    edges(graph).some(
      ([from, , to]) => from === `${alpha}/implementation.ts` && to === `${alpha}/test/helper.ts`,
    ),
  );
});

it('preserves source edges and violations after adjacent TypeScript emission', (t) => {
  const sources = {
    [config]: 'export const enabled = true;',
    [`${alpha}/index.ts`]: 'export {};',
    [`${alpha}/helper.ts`]: 'export const helper = true;',
    [`${alpha}/implementation.ts`]:
      "import '../../../shared/config.js'; import './index.js'; import './helper.js';",
  };
  const f = fixture(t, {
    ...sources,
    [`${alpha}/authored.js`]: "require('../../../shared/config.js');",
  });
  const before = f.graph();
  assert.deepEqual(violations(before), [
    ['service-dependencies', `${alpha}/authored.js`, config],
    ['service-dependencies', `${alpha}/implementation.ts`, config],
    ['service-own-root', `${alpha}/implementation.ts`, `${alpha}/index.ts`],
  ]);
  assert.ok(
    edges(before).some(
      ([from, specifier, to]) =>
        from === `${alpha}/implementation.ts` &&
        specifier === './helper.js' &&
        to === `${alpha}/helper.ts`,
    ),
  );
  for (const [file, source] of Object.entries(sources)) {
    const compiled = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, sourceMap: true },
    });
    f.write(file.replace(/\.ts$/, '.js'), compiled.outputText);
    assert.ok(compiled.sourceMapText);
    f.write(file.replace(/\.ts$/, '.js.map'), compiled.sourceMapText);
  }
  const after = f.graph();
  assert.deepEqual(edges(after), edges(before));
  assert.deepEqual(violations(after), violations(before));
});

it('resolves the approved workspace export to source without a build and keeps other exports restricted', (t) => {
  const contract = 'packages/app-contracts';
  const manifest = `${contract}/src/manifest/index.ts`;
  const f = fixture(t, {
    [`${alpha}/implementation.ts`]: `
      import '@tryghost/app-contracts/manifest';
      import '@tryghost/errors';
    `,
    [`${alpha}/other.ts`]: "import '@tryghost/app-contracts/other';",
    [`${alpha}/root.ts`]: "import '@tryghost/app-contracts';",
    [`${alpha}/private.ts`]: "import '@tryghost/app-contracts/private';",
    [`${contract}/package.json`]: JSON.stringify({
      name: '@tryghost/app-contracts',
      type: 'module',
      exports: {
        '.': { source: './src/index.ts', default: './build/index.js' },
        './manifest': {
          types: './build/manifest/index.d.ts',
          source: './src/manifest/index.ts',
          default: './build/manifest/index.js',
        },
        './other': { source: './src/other.ts', default: './build/other.js' },
      },
    }),
    [manifest]: 'export const schema = {};',
    [`${contract}/build/manifest/index.d.ts`]: 'export declare const schema: object;',
    [`${contract}/src/index.ts`]: 'export const other = true;',
    [`${contract}/src/other.ts`]: 'export const other = true;',
    [`${contract}/private.js`]: 'module.exports = {};',
    'node_modules/@tryghost/errors/package.json': JSON.stringify({
      name: '@tryghost/errors',
      exports: { '.': { types: './index.d.ts', default: './index.js' } },
    }),
    'node_modules/@tryghost/errors/index.d.ts': 'export declare class GhostError {}',
    'node_modules/@tryghost/errors/index.js': 'module.exports = {};',
  });
  f.link(contract, 'node_modules/@tryghost/app-contracts');
  const before = f.graph();
  assert.ok(
    edges(before).some(
      ([from, specifier, to]) =>
        from === `${alpha}/implementation.ts` &&
        specifier === '@tryghost/app-contracts/manifest' &&
        to === manifest,
    ),
  );
  assert.ok(
    edges(before).some(
      ([, specifier, to]) =>
        specifier === '@tryghost/errors' && to === 'node_modules/@tryghost/errors/index.js',
    ),
  );
  assert.deepEqual(violations(before), [
    ['service-dependencies', `${alpha}/other.ts`, `${contract}/src/other.ts`],
    ['service-dependencies', `${alpha}/private.ts`, '@tryghost/app-contracts/private'],
    ['service-dependencies', `${alpha}/root.ts`, `${contract}/src/index.ts`],
    ['service-unresolved', `${alpha}/private.ts`, '@tryghost/app-contracts/private'],
  ]);
  f.write(`${contract}/build/manifest/index.js`, 'export const schema = {};');
  f.write(`${contract}/build/index.js`, 'export const other = true;');
  f.write(`${contract}/build/other.js`, 'export const other = true;');
  const after = f.graph();
  assert.deepEqual(edges(after), edges(before));
  assert.deepEqual(violations(after), violations(before));
});

it('preserves app boundaries and the test-selector allowance after workspace exports resolve', (t) => {
  const f = fixture(t, {
    'apps/shade/src/forbidden.ts': "import '@tryghost/admin-x-framework/helpers';",
    'apps/admin-x-framework/src/forbidden.ts': "import '@tryghost/activitypub/api';",
    'apps/admin-x-framework/src/root.ts': "import '@tryghost/activitypub';",
    'apps/portal/src/forbidden.ts': "import '@tryghost/shade/primitives';",
    'apps/portal/src/test-data.ts': "import '@tryghost/test-data';",
    'apps/portal/src/selectors.ts': "import '@tryghost/test-data/selectors/member';",
  });
  for (const [name, directory, subpath, target] of [
    ['@tryghost/admin-x-framework', 'apps/admin-x-framework', './helpers', 'helpers.ts'],
    ['@tryghost/activitypub', 'apps/activitypub', './api', 'index.ts'],
    ['@tryghost/shade', 'apps/shade', './primitives', 'primitives.ts'],
    ['@tryghost/test-data', 'packages/testing/test-data', '.', 'index.ts'],
  ] as const) {
    f.write(
      `${directory}/package.json`,
      JSON.stringify({
        name,
        exports: {
          [subpath]: {
            source: `./src/${target}`,
            default: `./build/${target.replace('.ts', '.js')}`,
          },
          ...(name === '@tryghost/test-data' ? { './selectors/*': './src/selectors/*.ts' } : {}),
          ...(name === '@tryghost/activitypub'
            ? {
                '.': { import: './dist/activitypub.js', require: './dist/activitypub.umd.cjs' },
              }
            : {}),
        },
      }),
    );
    f.write(`${directory}/src/${target}`, 'export {};');
    f.link(directory, `node_modules/${name}`);
  }
  f.write('packages/testing/test-data/src/selectors/member.ts', 'export const member = "member";');
  const graph = f.graph(false, 'apps');
  const expected = [
    [
      'framework-not-feature-apps',
      'apps/admin-x-framework/src/forbidden.ts',
      'apps/activitypub/src/index.ts',
    ],
    ['framework-not-feature-apps', 'apps/admin-x-framework/src/root.ts', '@tryghost/activitypub'],
    [
      'no-test-data-in-production-source',
      'apps/portal/src/test-data.ts',
      'packages/testing/test-data/src/index.ts',
    ],
    ['public-apps-not-admin-libs', 'apps/portal/src/forbidden.ts', 'apps/shade/src/primitives.ts'],
    ['shade-is-leaf', 'apps/shade/src/forbidden.ts', 'apps/admin-x-framework/src/helpers.ts'],
  ];
  assert.deepEqual(violations(graph), expected);
  assert.ok(
    edges(graph).some(
      ([from, , to]) =>
        from === 'apps/portal/src/selectors.ts' &&
        to === 'packages/testing/test-data/src/selectors/member.ts',
    ),
  );
  const output = 'apps/activitypub/dist/activitypub.js';
  f.write(output, "import '../../../packages/output-only/index.js';");
  f.write('apps/activitypub/dist/unreferenced.js', 'export {};');
  f.write('packages/output-only/index.js', 'export {};');
  const built = f.graph(false, 'apps');
  assert.deepEqual(
    violations(built),
    expected.map(([rule, from, to]) => [rule, from, to === '@tryghost/activitypub' ? output : to]),
  );
  assert.ok(
    edges(built).some(
      ([from, specifier, to]) =>
        from === 'apps/admin-x-framework/src/root.ts' &&
        specifier === '@tryghost/activitypub' &&
        to === output,
    ),
  );
  assert.deepEqual(built.modules.find(({ source }) => source === output)?.dependencies, []);
  assert.ok(!built.modules.some(({ source }) => source === 'packages/output-only/index.js'));
  assert.ok(
    !built.modules.some(({ source }) => source === 'apps/activitypub/dist/unreferenced.js'),
  );
});

it('invalidates cached boundary checks and fixture tests when their configuration changes', () => {
  const root = JSON.parse(readFileSync(path.join(repository, 'package.json'), 'utf8'));
  assert.ok(root.nx.targets['lint:boundaries'].inputs.includes(`{workspaceRoot}/${resolver}`));
  for (const input of ['ghost/core/**/*', 'ghost/package.json', 'packages/**/*', 'koenig/**/*']) {
    assert.ok(root.nx.targets['lint:boundaries'].inputs.includes(`{workspaceRoot}/${input}`));
  }
  const scripts = JSON.parse(
    readFileSync(path.join(repository, 'tools/scripts/package.json'), 'utf8'),
  );
  assert.ok(
    scripts.nx.namedInputs.serviceDependencyContracts.includes(
      '{workspaceRoot}/.dependency-cruiser.cjs',
    ),
  );
  for (const target of ['test', 'test:unit']) {
    assert.ok(scripts.nx.targets[target].inputs.includes('serviceDependencyContracts'));
  }
});
