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
const resolver = 'tools/scripts/lib/service-dependency-resolver.mjs';
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
  const run = (output = 'json', audit = false) => {
    const result = spawnSync(
      process.execPath,
      [cli, services, '--config', '.dependency-cruiser.cjs', '--output-type', output],
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
    graph(audit = false): ICruiseResult {
      const result = run('json', audit);
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
    'ghost/core/server/lib/public-jwk.ts': 'export const key = true;',
    [`${services}/jobs-service/job.ts`]: 'export class Job {}',
    [`${alpha}/implementation.ts`]: `
      import './helper'; import type {Config} from '../../../shared/config';
      export type {Config} from '../../../shared/config';
      import '@tryghost/errors'; import '@tryghost/errors/detail'; import '@tryghost/tpl'; import 'zod';
      import 'node:crypto'; import 'util'; import '../../lib/db-types/date';
      import '../../lib/public-jwk'; import '../jobs-service/job';
    `,
  });
  for (const name of ['@tryghost/errors', '@tryghost/tpl', 'zod']) {
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

it('rejects outside dependencies, own roots and unresolved imports without folder or package-prefix escapes', (t) => {
  const imports = {
    'require.ts': "require('../../../shared/config');",
    'static.ts': "import '../../../shared/config';",
    'dynamic.ts': "import('../../../shared/config');",
    'reexport.ts': "export {enabled} from '../../../shared/config';",
    'nested/index.ts': "import '../../../../shared/config';",
    'test/helper.ts': "import '../../../../shared/config';",
    'sibling.ts': "import '../alpha-extra/helper';",
    'package.ts': "import '@tryghost/errors-extra';",
    'shared.ts': "import '../../lib/db-types/other';",
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
    'node_modules/@tryghost/errors-extra/package.json': '{"main":"index.js"}',
    'node_modules/@tryghost/errors-extra/index.js': 'module.exports = {};',
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

it('invalidates cached boundary checks and fixture tests when their configuration changes', () => {
  const root = JSON.parse(readFileSync(path.join(repository, 'package.json'), 'utf8'));
  assert.ok(root.nx.targets['lint:boundaries'].inputs.includes(`{workspaceRoot}/${resolver}`));
  assert.ok(root.nx.targets['lint:boundaries'].inputs.includes('{workspaceRoot}/ghost/core/**/*'));
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
