import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire, findPackageJSON } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it, type TestContext } from 'node:test';
import type { ICruiseResult } from 'dependency-cruiser';
import ts from 'typescript';
import {
  committedBuildOutput,
  dependencyIdentity,
  readKnownViolations,
} from '../lib/dependency-boundaries.ts';
import { legacyInventoryFile, readLegacyServices } from '../../configs/oxlint/legacy-services.ts';

const repository = path.resolve(import.meta.dirname, '../../..');
const services = 'ghost/core/server/services';
const alpha = `${services}/alpha`;
const config = 'ghost/core/shared/config.ts';
const resolver = 'tools/scripts/ci/service-dependency-resolver.mjs';
const depcruiseManifest =
  findPackageJSON('dependency-cruiser', import.meta.url) ??
  assert.fail('dependency-cruiser is not installed');
const cli = path.join(
  path.dirname(depcruiseManifest),
  (JSON.parse(readFileSync(depcruiseManifest, 'utf8')) as { bin: { depcruise: string } }).bin
    .depcruise,
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
    // alpha is not listed, so it is a standard service.
    [legacyInventoryFile]: JSON.stringify({
      services: { legacy: { kind: 'directory', disposition: 'migrate' } },
    }),
    'tools/scripts/package.json': '{"type":"module"}',
    'tools/configs/oxlint/package.json': '{"type":"module"}',
    '.dependency-cruiser-known-violations.json': '[]',
    'apps/empty.ts': 'export {};',
    [config]: 'export const enabled = true; export interface Config {}',
    ...files,
  })) {
    write(file, source);
  }
  for (const file of [
    'tools/scripts/lib/dependency-boundaries.ts',
    'tools/configs/oxlint/legacy-services.ts',
    'tools/scripts/ci/check-boundaries.ts',
  ]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    cpSync(path.join(repository, file), path.join(root, file));
  }
  // Each workspace resolves its own dependencies, so the copied inventory reader
  // finds the YAML parser that @internal/cfg-oxlint declares.
  for (const file of [
    resolver,
    'tools/scripts/node_modules',
    'tools/configs/oxlint/node_modules',
  ]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    symlinkSync(path.join(repository, file), path.join(root, file));
  }
  const run = (output = 'json', input = services, args: string[] = []) => {
    const result = spawnSync(
      process.execPath,
      [cli, input, '--config', '.dependency-cruiser.cjs', '--output-type', output, ...args],
      {
        cwd: root,
        encoding: 'utf8',
      },
    );
    assert.ifError(result.error);
    assert.notEqual(result.status, null, result.stderr);
    return result;
  };
  return {
    write,
    run,
    root,
    lint(staged: string[] = []) {
      return spawnSync(
        process.execPath,
        ['tools/scripts/ci/check-boundaries.ts', ...(staged.length ? ['--', ...staged] : [])],
        {
          cwd: root,
          encoding: 'utf8',
        },
      );
    },
    link(source: string, destination: string) {
      mkdirSync(path.dirname(path.join(root, destination)), { recursive: true });
      symlinkSync(path.join(root, source), path.join(root, destination));
    },
    graph(input = services): ICruiseResult {
      const result = run('json', input);
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

it('enforces every implementation whether or not its service is a legacy entry', (t) => {
  const f = fixture(t, {
    [`${alpha}/implementation.ts`]: "import '../../../shared/config';",
    [`${alpha}/index.js`]: "require('../../../shared/config');",
    [`${services}/legacy/implementation.js`]: "require('../../../shared/config');",
    [`${services}/legacy/index.js`]: "require('../../../shared/config');",
    [`${services}/unlisted/helper.ts`]: "import '../../../shared/config';",
    [`${services}/unlisted.ts`]: "import '../../shared/config';",
  });
  const expected = [
    `${alpha}/implementation.ts`,
    `${services}/legacy/implementation.js`,
    `${services}/unlisted.ts`,
    `${services}/unlisted/helper.ts`,
  ].sort();
  assert.deepEqual(
    violations(f.graph()).map(([, from]) => from),
    expected,
  );
  assert.equal(f.run('err').status, 4);
  const markdown = f.run('markdown');
  assert.equal(markdown.status, 0);
  assert.ok(markdown.stdout.includes(`${services}/unlisted/helper.ts`));
  for (const entries of [{ alpha: {} }, {}]) {
    f.write(legacyInventoryFile, JSON.stringify({ services: entries }));
    assert.deepEqual(
      violations(f.graph()).map(([, from]) => from),
      expected,
    );
  }
});

it('rejects new and moved dependencies and stale entries through the boundary lint command', (t) => {
  const from = `${services}/legacy/implementation.js`;
  const known = { rule: 'service-dependencies', from, to: config };
  const f = fixture(t, {
    [from]: "require('../../../shared/config');",
    '.dependency-cruiser-known-violations.json': JSON.stringify([known]),
  });
  const initial = f.lint();
  assert.equal(initial.status, 0, initial.stderr);
  f.write(`${services}/legacy/new.js`, "require('../../../shared/config');");
  const added = f.lint();
  assert.equal(added.status, 1, added.stderr);
  assert.match(added.stderr, /legacy\/new.js/);
  f.write(from, '');
  const moved = f.lint();
  assert.equal(moved.status, 1, moved.stderr);
  assert.match(moved.stderr, /error service-dependencies:.*legacy\/new.js/);
  assert.match(moved.stderr, /stale known violation:.*legacy\/implementation.js/);
  f.write(`${services}/legacy/new.js`, '');
  const fixed = f.lint();
  assert.equal(fixed.status, 1, fixed.stderr);
  assert.match(fixed.stderr, /Remove it from .dependency-cruiser-known-violations.json/);
  f.write('.dependency-cruiser-known-violations.json', '[]');
  assert.equal(f.lint().status, 0);
});

it('applies the known violations when the commit hook checks only the staged files', (t) => {
  const from = `${services}/legacy/implementation.js`;
  const other = `${services}/legacy/other.js`;
  const f = fixture(t, {
    [from]: "require('../../../shared/config');",
    [other]: "require('../../../shared/config');",
    '.dependency-cruiser-known-violations.json': JSON.stringify(
      [from, other].map((file) => ({ rule: 'service-dependencies', from: file, to: config })),
    ),
  });
  // A file with a known violation can be committed.
  const known = f.lint([from]);
  assert.equal(known.status, 0, known.stderr);
  // The other file is not scanned, so its entry is not reported as stale.
  f.write(other, '');
  const partial = f.lint([from]);
  assert.equal(partial.status, 0, partial.stderr);
  assert.equal(f.lint().status, 1);
  // A new violation in a staged file still fails.
  f.write(`${services}/legacy/new.js`, "require('../../../shared/config');");
  const added = f.lint([`${services}/legacy/new.js`]);
  assert.equal(added.status, 1, added.stderr);
  assert.match(added.stderr, /error service-dependencies:.*legacy\/new.js/);
  // A file the scan skips leaves nothing to check.
  f.write('ghost/core/test/unit/skipped.js', "require('../../shared/config');");
  const skipped = f.lint(['ghost/core/test/unit/skipped.js']);
  assert.equal(skipped.status, 0, skipped.stderr);
});

it('rejects known violations for standard services, duplicates and non-service rules', (t) => {
  const known = { rule: 'service-dependencies', from: `${alpha}/implementation.ts`, to: config };
  const f = fixture(t, { '.dependency-cruiser-known-violations.json': JSON.stringify([known]) });
  assert.throws(() => readKnownViolations(f.root), /does not belong to a legacy service/);
  f.write(legacyInventoryFile, JSON.stringify({ services: { alpha: {} } }));
  f.write('.dependency-cruiser-known-violations.json', JSON.stringify([known, known]));
  assert.throws(() => readKnownViolations(f.root), /duplicate entry/);
  f.write(
    '.dependency-cruiser-known-violations.json',
    JSON.stringify([{ ...known, rule: 'kernel-not-application' }]),
  );
  assert.throws(() => readKnownViolations(f.root));
});

it('keeps the checked-in known violations limited to legacy services', () => {
  assert.doesNotThrow(() => readKnownViolations(repository));
});

it('reports but does not gate legacy services that defer dependency checks', (t) => {
  const from = `${services}/busy/implementation.js`;
  const f = fixture(t, {
    [from]: "require('../../../shared/config');",
    [legacyInventoryFile]: JSON.stringify({
      services: { busy: { dependencyChecks: 'deferred' } },
    }),
  });
  const added = f.lint();
  assert.equal(added.status, 0, added.stderr);
  assert.match(added.stdout, /0 known violations, 1 in services with deferred enforcement/);
  assert.deepEqual(violations(f.graph()), [['service-dependencies', from, config]]);

  // A sibling that is not listed is still gated from its first file.
  f.write(`${services}/busy-extra/implementation.js`, "require('../../../shared/config');");
  const sibling = f.lint();
  assert.equal(sibling.status, 1, sibling.stderr);
  assert.match(sibling.stderr, /busy-extra\/implementation.js/);
  f.write(`${services}/busy-extra/implementation.js`, '');

  // Deferred services keep no entries, so the file cannot hide what they add.
  f.write(
    '.dependency-cruiser-known-violations.json',
    JSON.stringify([{ rule: 'service-dependencies', from, to: config }]),
  );
  assert.throws(() => readKnownViolations(f.root), /deferred enforcement/);
  const listed = f.lint();
  assert.equal(listed.status, 1, listed.stderr);
  f.write('.dependency-cruiser-known-violations.json', '[]');

  // Only the exact value defers checks.
  f.write(legacyInventoryFile, JSON.stringify({ services: { busy: { dependencyChecks: 'off' } } }));
  assert.throws(() => readKnownViolations(f.root), /can only be "deferred"/);

  // Deleting the legacy entry ends the deferral: the service must be standard.
  f.write(legacyInventoryFile, JSON.stringify({ services: {} }));
  const removed = f.lint();
  assert.equal(removed.status, 1, removed.stderr);
  assert.match(removed.stderr, /error service-dependencies:.*busy\/implementation.js/);
});

it('defers dependency checks only for the services that already had them deferred', () => {
  // Deferral may only shrink. Remove a name here when its entry is deleted.
  const allowed = ['automations', 'members', 'members-metafields', 'stripe'];
  const deferred = [...readLegacyServices(repository)]
    .filter(([, service]) => service.deferred)
    .map(([name]) => name);
  assert.deepEqual(
    deferred.filter((name) => !allowed.includes(name)),
    [],
    'Do not defer dependency checks for more services',
  );
});

it('matches external packages across stores without merging subpaths or workspace targets', () => {
  const violation = {
    rule: { name: 'service-dependencies', severity: 'error' as const },
    from: `${alpha}/implementation.ts`,
    to: '/store/one/node_modules/client/index.js',
    unresolvedTo: 'client',
  };
  const identity = dependencyIdentity(violation);
  assert.deepEqual(
    dependencyIdentity({ ...violation, to: '/store/two/node_modules/client/index.js' }),
    identity,
  );
  assert.notDeepEqual(
    dependencyIdentity({ ...violation, unresolvedTo: 'client/private' }),
    identity,
  );
  assert.notDeepEqual(dependencyIdentity({ ...violation, from: `${alpha}/moved.ts` }), identity);
  assert.equal(
    dependencyIdentity({ ...violation, to: 'packages/client/src/index.ts' }).to,
    'packages/client/src/index.ts',
  );
  assert.notDeepEqual(
    dependencyIdentity({ ...violation, to: 'packages/client/src/index.ts' }),
    dependencyIdentity({ ...violation, to: 'packages/client/src/moved.ts' }),
  );
});

it('continues enforcing non-service boundaries in the same scan', (t) => {
  const f = fixture(t, {
    'ghost/core/kernel/forbidden.ts': "import '../shared/config';",
  });
  const result = f.lint();
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /kernel-not-application/);
});

it('rejects a defineService root outside the services directory unless it is a listed exception', (t) => {
  const helper = 'ghost/core/kernel/define-service.ts';
  const use = (depth: number) =>
    `import { defineService } from '${'../'.repeat(depth)}kernel/define-service'; export default defineService;`;
  const outside = 'ghost/core/server/lib/capability/index.ts';
  const nested = `${alpha}/nested/index.ts`;
  const f = fixture(t, {
    [helper]: 'export const defineService = () => ({});',
    [`${alpha}/index.ts`]: use(3),
    'ghost/core/server/auth/better-auth/index.ts': use(3),
    // Types say nothing about where an instance is built.
    'ghost/core/server/web/consumer.ts':
      "import type { defineService } from '../../kernel/define-service'; export type Root = typeof defineService;",
  });
  const allowed = f.lint();
  assert.equal(allowed.status, 0, allowed.stderr);
  f.write(outside, use(3));
  f.write(nested, use(4));
  const rejected = f.lint();
  assert.equal(rejected.status, 1, rejected.stderr);
  for (const file of [outside, nested]) {
    assert.ok(
      rejected.stderr.includes(`error service-roots-in-services: ${file} → ${helper}`),
      rejected.stderr,
    );
  }
  assert.equal(rejected.stderr.match(/service-roots-in-services/g)?.length, 2, rejected.stderr);
  // Known violations are for legacy service dependencies, so this cannot be recorded as one.
  f.write(
    '.dependency-cruiser-known-violations.json',
    JSON.stringify([{ rule: 'service-roots-in-services', from: outside, to: helper }]),
  );
  assert.throws(() => readKnownViolations(f.root));
});

it('lists only roots outside the services directory that exist and use defineService', () => {
  const { forbidden } = createRequire(import.meta.url)(
    path.join(repository, '.dependency-cruiser.cjs'),
  ) as { forbidden: { name: string; from: { pathNot?: string[] } }[] };
  const rule = forbidden.find(({ name }) => name === 'service-roots-in-services');
  const listed = (rule?.from.pathNot ?? []).slice(2).map((pattern) => {
    assert.match(pattern, /^\^[\w./\\-]+\$$/, 'List each root as one exact path');
    return pattern.slice(1, -1).replaceAll('\\', '');
  });
  assert.deepEqual(listed, ['ghost/core/server/auth/better-auth/index.ts']);
  for (const file of listed) {
    assert.match(readFileSync(path.join(repository, file), 'utf8'), /kernel\/define-service'/);
  }
});

it('keeps native ignore-known behavior documented: moves fail but stale entries are accepted', (t) => {
  const from = `${services}/legacy/implementation.js`;
  const f = fixture(t, { [from]: "require('../../../shared/config');" });
  f.write('native-baseline.json', JSON.stringify(f.graph().summary.violations));
  assert.equal(f.run('err', services, ['--ignore-known', 'native-baseline.json']).status, 0);
  f.write(from, '');
  assert.equal(f.run('err', services, ['--ignore-known', 'native-baseline.json']).status, 0);
  f.write(`${services}/legacy/moved.js`, "require('../../../shared/config');");
  assert.equal(f.run('err', services, ['--ignore-known', 'native-baseline.json']).status, 1);
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

it('allows the exact libraries required by Custom Theme Settings without allowing siblings', (t) => {
  const approved = ['@tryghost/nql', '@tryghost/nql/index.js'];
  const rejected = ['@tryghost/nql/other', '@tryghost/nql-extra'];
  const f = fixture(t, {
    [`${alpha}/approved.js`]: approved.map((name) => `require('${name}');`).join('\n'),
    [`${alpha}/rejected.ts`]: rejected.map((name) => `import '${name}';`).join('\n'),
  });
  for (const name of ['@tryghost/nql', '@tryghost/nql-extra']) {
    f.write(`node_modules/${name}/package.json`, JSON.stringify({ name, main: 'index.js' }));
    f.write(`node_modules/${name}/index.js`, 'module.exports = {};');
    f.write(`node_modules/${name}/other.js`, 'module.exports = {};');
  }
  const graph = f.graph();
  assert.equal(
    edges(graph).filter(([from]) => from === `${alpha}/approved.js`).length,
    approved.length,
  );
  assert.deepEqual(
    violations(graph),
    ['node_modules/@tryghost/nql/other.js', 'node_modules/@tryghost/nql-extra/index.js']
      .map((to) => ['service-dependencies', `${alpha}/rejected.ts`, to])
      .sort(),
  );
});

it('allows individual Lodash functions without allowing the whole library, its builds or lodash/fp', (t) => {
  const approved = ['lodash/isEmpty', 'lodash/isEmpty.js', 'lodash/pick', 'lodash/indexOf'];
  const rejected = {
    lodash: 'index.js',
    'lodash/index': 'index.js',
    'lodash/lodash': 'lodash.js',
    'lodash/core': 'core.js',
    'lodash/core.min': 'core.min.js',
    'lodash/fp': 'fp.js',
    'lodash/fp/map': 'fp/map.js',
    'lodash/_baseGet': '_baseGet.js',
    'lodash-es/pick': '../lodash-es/pick.js',
  };
  const f = fixture(t, {
    [`${alpha}/approved.js`]: approved.map((name) => `require('${name}');`).join('\n'),
    [`${alpha}/rejected.js`]: Object.keys(rejected)
      .map((name) => `require('${name}');`)
      .join('\n'),
  });
  f.write('node_modules/lodash/package.json', JSON.stringify({ name: 'lodash', main: 'index.js' }));
  f.write('node_modules/lodash-es/package.json', JSON.stringify({ name: 'lodash-es' }));
  for (const file of [
    'isEmpty.js',
    'pick.js',
    'indexOf.js',
    ...Object.values(rejected).filter((target) => !target.startsWith('..')),
  ]) {
    f.write(`node_modules/lodash/${file}`, 'module.exports = {};');
  }
  f.write('node_modules/lodash-es/pick.js', 'module.exports = {};');
  const graph = f.graph();
  assert.equal(edges(graph).filter(([from]) => from === `${alpha}/approved.js`).length, 4);
  assert.deepEqual(
    violations(graph),
    [...new Set(Object.values(rejected))]
      .map((file) => [
        'service-dependencies',
        `${alpha}/rejected.js`,
        `node_modules/${file.startsWith('..') ? file.slice(3) : `lodash/${file}`}`,
      ])
      .sort(),
  );
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
    'ghost/core/server/lib/link-replacer.ts': 'export {};',
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

it('allows the exact libraries and image helpers required by Media inliner without allowing siblings', (t) => {
  const approved = [
    'mime-types',
    'path',
    'node:path',
    'vm',
    'node:vm',
    '../../lib/image/image-content',
    '../../lib/image/svg-sanitizer',
  ];
  const rejected = [
    'mime-types/other',
    'mime-types-extra',
    'node:fs',
    '../../lib/image/image-formats',
    '../../lib/image/svg-sanitizer-extra',
  ];
  const f = fixture(t, {
    [`${alpha}/approved.js`]: approved.map((name) => `require('${name}');`).join('\n'),
    [`${alpha}/rejected.ts`]: rejected.map((name) => `import '${name}';`).join('\n'),
    'ghost/core/server/lib/image/image-content.ts': 'export const isSvgExtension = () => false;',
    'ghost/core/server/lib/image/svg-sanitizer.ts': 'export const sanitizeSvgBuffer = () => null;',
    'ghost/core/server/lib/image/image-formats.ts': 'export const getImageFormat = () => null;',
    'ghost/core/server/lib/image/svg-sanitizer-extra.ts': 'export {};',
  });
  for (const name of ['mime-types', 'mime-types-extra']) {
    f.write(`node_modules/${name}/package.json`, JSON.stringify({ name, main: 'index.js' }));
    f.write(`node_modules/${name}/index.js`, 'module.exports = {};');
    f.write(`node_modules/${name}/other.js`, 'module.exports = {};');
  }
  const graph = f.graph();
  // The bare and node: forms of a built-in resolve to one edge each.
  assert.deepEqual(
    edges(graph)
      .filter(([from]) => from === `${alpha}/approved.js`)
      .map(([, , to]) => to)
      .sort(),
    [
      'ghost/core/server/lib/image/image-content.ts',
      'ghost/core/server/lib/image/svg-sanitizer.ts',
      'node_modules/mime-types/index.js',
      'path',
      'vm',
    ],
  );
  assert.deepEqual(
    violations(graph),
    [
      'node_modules/mime-types/other.js',
      'node_modules/mime-types-extra/index.js',
      'fs',
      'ghost/core/server/lib/image/image-formats.ts',
      'ghost/core/server/lib/image/svg-sanitizer-extra.ts',
    ]
      .map((to) => ['service-dependencies', `${alpha}/rejected.ts`, to])
      .sort(),
  );
});

it('allows the debug tracing library without allowing sibling packages', (t) => {
  const f = fixture(t, {
    [`${alpha}/approved.js`]:
      "require('@tryghost/debug')('alpha'); require('@tryghost/debug/lib/debug');",
    [`${alpha}/rejected.ts`]: "import '@tryghost/debug-extra'; import 'debug';",
  });
  for (const name of ['@tryghost/debug', '@tryghost/debug-extra', 'debug']) {
    f.write(`node_modules/${name}/package.json`, JSON.stringify({ name, main: 'index.js' }));
    f.write(`node_modules/${name}/index.js`, 'module.exports = {};');
  }
  f.write('node_modules/@tryghost/debug/lib/debug.js', 'module.exports = () => () => {};');
  const graph = f.graph();
  assert.equal(edges(graph).filter(([from]) => from === `${alpha}/approved.js`).length, 2);
  assert.deepEqual(
    violations(graph),
    ['node_modules/@tryghost/debug-extra/index.js', 'node_modules/debug/index.js']
      .map((to) => ['service-dependencies', `${alpha}/rejected.ts`, to])
      .sort(),
  );
});

it('allows the Ghost version as a process fact without allowing sibling packages or internals', (t) => {
  const f = fixture(t, {
    [`${alpha}/approved.js`]: "require('@tryghost/version');",
    [`${alpha}/rejected.ts`]:
      "import '@tryghost/version/lib/version'; import '@tryghost/version-extra';",
  });
  for (const name of ['@tryghost/version', '@tryghost/version-extra']) {
    f.write(`node_modules/${name}/package.json`, JSON.stringify({ name, main: 'index.js' }));
    f.write(`node_modules/${name}/index.js`, 'module.exports = {};');
  }
  f.write('node_modules/@tryghost/version/lib/version.js', 'module.exports = {};');
  const graph = f.graph();
  assert.equal(edges(graph).filter(([from]) => from === `${alpha}/approved.js`).length, 1);
  assert.deepEqual(
    violations(graph),
    [
      'node_modules/@tryghost/version/lib/version.js',
      'node_modules/@tryghost/version-extra/index.js',
    ]
      .map((to) => ['service-dependencies', `${alpha}/rejected.ts`, to])
      .sort(),
  );
});

it('allows the validator and NQL strings without their siblings or internals', (t) => {
  const nqlString = 'packages/nql-string/src/index.ts';
  const nqlInternal = 'packages/nql-string/src/other.ts';
  const f = fixture(t, {
    [nqlString]: 'export {};',
    [nqlInternal]: 'export {};',
    [`${alpha}/approved.js`]:
      "require('@tryghost/validator'); require('../../../../../packages/nql-string/src/index');",
    [`${alpha}/rejected.js`]: `
      require('@tryghost/validator/lib/is-email');
      require('@tryghost/validator-extra');
      require('../../../../../packages/nql-string/src/other');
    `,
  });
  for (const name of ['@tryghost/validator', '@tryghost/validator-extra']) {
    f.write(`node_modules/${name}/package.json`, JSON.stringify({ name, main: 'index.js' }));
    f.write(`node_modules/${name}/index.js`, 'module.exports = {};');
  }
  f.write('node_modules/@tryghost/validator/lib/is-email.js', 'module.exports = {};');
  const graph = f.graph();
  assert.equal(edges(graph).filter(([from]) => from === `${alpha}/approved.js`).length, 2);
  assert.deepEqual(
    violations(graph),
    [
      'node_modules/@tryghost/validator/lib/is-email.js',
      'node_modules/@tryghost/validator-extra/index.js',
      nqlInternal,
    ]
      .map((to) => ['service-dependencies', `${alpha}/rejected.js`, to])
      .sort(),
  );
});

it('allows anything in the contracts folder, like types', (t) => {
  const contract = 'contracts/example/src/index.ts';
  const nested = 'contracts/example/src/fields/phone.ts';
  const lookalike = 'contracts-extra/example/src/index.ts';
  const f = fixture(t, {
    [contract]: 'export {};',
    [nested]: 'export {};',
    [lookalike]: 'export {};',
    [`${alpha}/approved.js`]:
      "require('../../../../../contracts/example/src/index'); require('../../../../../contracts/example/src/fields/phone');",
    [`${alpha}/rejected.js`]: "require('../../../../../contracts-extra/example/src/index');",
  });
  const graph = f.graph();
  assert.equal(edges(graph).filter(([from]) => from === `${alpha}/approved.js`).length, 2);
  assert.deepEqual(violations(graph), [
    ['service-dependencies', `${alpha}/rejected.js`, lookalike],
  ]);
});

it('allows the custom field contract through its public entries only', (t) => {
  const entries = ['index', 'structure', 'shapes', 'identity', 'countries', 'phone'];
  const internal = 'packages/metafield-types/src/internal.ts';
  const f = fixture(t, {
    ...Object.fromEntries(
      [...entries.map((entry) => `packages/metafield-types/src/${entry}.ts`), internal].map(
        (file) => [file, 'export {};'],
      ),
    ),
    [`${alpha}/approved.js`]: entries
      .map((entry) => `require('../../../../../packages/metafield-types/src/${entry}');`)
      .join('\n'),
    [`${alpha}/rejected.js`]: "require('../../../../../packages/metafield-types/src/internal');",
  });
  const graph = f.graph();
  assert.equal(
    edges(graph).filter(([from]) => from === `${alpha}/approved.js`).length,
    entries.length,
  );
  assert.deepEqual(violations(graph), [['service-dependencies', `${alpha}/rejected.js`, internal]]);
});

it('allows the shared stateless helpers without allowing their siblings', (t) => {
  const approved = [
    'ghost/core/server/lib/after-commit.ts',
    'ghost/core/server/lib/db-types/count.ts',
    'ghost/core/server/lib/db-types/affected-rows.ts',
    'ghost/core/server/lib/db-types/object-id.ts',
    'ghost/core/server/lib/mailgun/mailgun-message-id.ts',
    'ghost/core/server/lib/mailgun/mailgun-error.ts',
    'ghost/core/server/lib/promise-pool.ts',
    'ghost/core/server/lib/soonest-timer.ts',
    'ghost/core/server/lib/auto-filling-map.ts',
    'ghost/core/server/lib/member-signup-contexts.ts',
    'ghost/core/shared/errify.ts',
    'ghost/core/shared/timing-safe-string-equal.ts',
    'ghost/core/shared/one-at-a-time.ts',
    'ghost/core/shared/machine-payments.ts',
    'packages/parse-email-address/src/index.ts',
    'packages/parse-email-address/src/mailbox.ts',
    'ghost/core/server/adapters/scheduling/get-scheduler-idempotency-key.ts',
  ];
  const rejected = [
    'ghost/core/server/adapters/scheduling/build-signed-job.ts',
    'ghost/core/server/lib/mailgun/mailgun-client.ts',
    'ghost/core/server/lib/after-commit-extra.ts',
    'ghost/core/shared/errify-extra.ts',
    'packages/parse-email-address/src/internal.ts',
  ];
  const requireAll = (files: string[]) =>
    files.map((file) => `require('../../../../../${file.replace(/\.ts$/, '')}');`).join('\n');
  const f = fixture(t, {
    ...Object.fromEntries([...approved, ...rejected].map((file) => [file, 'export {};'])),
    [`${alpha}/approved.js`]: requireAll(approved),
    [`${alpha}/rejected.js`]: requireAll(rejected),
  });
  const graph = f.graph();
  assert.equal(
    edges(graph).filter(([from]) => from === `${alpha}/approved.js`).length,
    approved.length,
  );
  assert.deepEqual(
    violations(graph),
    rejected.map((to) => ['service-dependencies', `${alpha}/rejected.js`, to]).sort(),
  );
});

it('allows Node in-memory primitives without allowing modules that reach the machine', (t) => {
  const f = fixture(t, {
    [`${alpha}/approved.js`]: `
      require('node:assert/strict'); require('stream'); require('node:stream/promises');
      require('buffer'); require('node:timers/promises');
    `,
    [`${alpha}/rejected.js`]: `
      require('assert'); require('events'); require('url'); require('timers');
      require('node:fs'); require('os'); require('net'); require('child_process');
    `,
  });
  const graph = f.graph();
  assert.equal(edges(graph).filter(([from]) => from === `${alpha}/approved.js`).length, 5);
  assert.deepEqual(
    violations(graph).filter(([, from]) => from === `${alpha}/approved.js`),
    [],
  );
  assert.deepEqual(
    violations(graph)
      .filter(([, from]) => from === `${alpha}/rejected.js`)
      .map(([, , to]) => (to ?? '').replace(/^node:/, ''))
      .sort(),
    ['assert', 'child_process', 'events', 'fs', 'net', 'os', 'timers', 'url'],
  );
});

it('allows the cheerio slim entry required by Mentions without allowing the main entry', (t) => {
  const f = fixture(t, {
    [`${alpha}/approved.js`]: "require('cheerio/slim');",
    [`${alpha}/rejected.ts`]: "import 'cheerio';",
  });
  f.write(
    'node_modules/cheerio/package.json',
    JSON.stringify({
      name: 'cheerio',
      main: 'dist/commonjs/index.js',
      exports: { '.': './dist/commonjs/index.js', './slim': './dist/commonjs/slim.js' },
    }),
  );
  f.write('node_modules/cheerio/dist/commonjs/index.js', 'module.exports = {};');
  f.write('node_modules/cheerio/dist/commonjs/slim.js', 'module.exports = {};');
  const graph = f.graph();
  assert.ok(
    edges(graph).some(
      ([from, , to]) =>
        from === `${alpha}/approved.js` && to === 'node_modules/cheerio/dist/commonjs/slim.js',
    ),
  );
  assert.deepEqual(violations(graph), [
    ['service-dependencies', `${alpha}/rejected.ts`, 'node_modules/cheerio/dist/commonjs/index.js'],
  ]);
});

it('allows the cheerio slim ESM entry required by Mentions without allowing the ESM main entry', (t) => {
  const f = fixture(t, {
    [`${alpha}/approved.js`]: "import 'cheerio/slim';",
    [`${alpha}/rejected.ts`]: "import 'cheerio';",
  });
  f.write(
    'node_modules/cheerio/package.json',
    JSON.stringify({
      name: 'cheerio',
      type: 'module',
      main: 'dist/esm/index.js',
      exports: { '.': './dist/esm/index.js', './slim': './dist/esm/slim.js' },
    }),
  );
  f.write('node_modules/cheerio/dist/esm/index.js', 'export {};');
  f.write('node_modules/cheerio/dist/esm/slim.js', 'export {};');
  const graph = f.graph();
  assert.ok(
    edges(graph).some(
      ([from, , to]) =>
        from === `${alpha}/approved.js` && to === 'node_modules/cheerio/dist/esm/slim.js',
    ),
  );
  assert.deepEqual(violations(graph), [
    ['service-dependencies', `${alpha}/rejected.ts`, 'node_modules/cheerio/dist/esm/index.js'],
  ]);
});

it('allows the magic-link constructor required by Newsletters without allowing its siblings', (t) => {
  const approved = 'ghost/core/server/lib/magic-link/magic-link.js';
  const rejected = 'ghost/core/server/lib/magic-link/other.js';
  const f = fixture(t, {
    [`${alpha}/approved.js`]: "require('../../lib/magic-link/magic-link');",
    [`${alpha}/rejected.ts`]: "import '../../lib/magic-link/other';",
    [approved]: 'module.exports = class MagicLink {};',
    [rejected]: 'module.exports = {};',
  });
  const graph = f.graph();
  assert.ok(
    edges(graph).some(([from, , to]) => from === `${alpha}/approved.js` && to === approved),
  );
  assert.deepEqual(violations(graph), [['service-dependencies', `${alpha}/rejected.ts`, rejected]]);
});

it('allows the exact libraries required by Comments without allowing siblings', (t) => {
  const approved = [
    '@tryghost/mongo-utils',
    '@tryghost/mongo-utils/index.js',
    '@tryghost/html-to-plaintext',
    '@tryghost/html-to-plaintext/index.js',
    'handlebars',
    'handlebars/lib/index.js',
  ];
  const rejected = [
    '@tryghost/mongo-utils/other',
    '@tryghost/mongo-utils-extra',
    '@tryghost/html-to-plaintext/other',
    '@tryghost/html-to-plaintext-extra',
    'handlebars/other',
    'handlebars-extra',
  ];
  const f = fixture(t, {
    [`${alpha}/approved.js`]: approved.map((name) => `require('${name}');`).join('\n'),
    [`${alpha}/rejected.ts`]: rejected.map((name) => `import '${name}';`).join('\n'),
  });
  for (const [name, main] of [
    ['@tryghost/mongo-utils', 'index.js'],
    ['@tryghost/mongo-utils-extra', 'index.js'],
    ['@tryghost/html-to-plaintext', 'index.js'],
    ['@tryghost/html-to-plaintext-extra', 'index.js'],
    ['handlebars', 'lib/index.js'],
    ['handlebars-extra', 'index.js'],
  ]) {
    f.write(`node_modules/${name}/package.json`, JSON.stringify({ name, main }));
    f.write(`node_modules/${name}/${main}`, 'module.exports = {};');
    f.write(`node_modules/${name}/other.js`, 'module.exports = {};');
  }
  const graph = f.graph();
  assert.deepEqual(
    [
      ...new Set(
        edges(graph)
          .filter(([from]) => from === `${alpha}/approved.js`)
          .map(([, , to]) => to),
      ),
    ].sort(),
    [
      'node_modules/@tryghost/html-to-plaintext/index.js',
      'node_modules/@tryghost/mongo-utils/index.js',
      'node_modules/handlebars/lib/index.js',
    ],
  );
  assert.deepEqual(
    violations(graph),
    [
      'node_modules/@tryghost/mongo-utils/other.js',
      'node_modules/@tryghost/mongo-utils-extra/index.js',
      'node_modules/@tryghost/html-to-plaintext/other.js',
      'node_modules/@tryghost/html-to-plaintext-extra/index.js',
      'node_modules/handlebars/other.js',
      'node_modules/handlebars-extra/index.js',
    ]
      .map((to) => ['service-dependencies', `${alpha}/rejected.ts`, to])
      .sort(),
  );
});

it('allows the delivery address formatter required by Staff without allowing its siblings', (t) => {
  const approved = 'ghost/core/server/lib/mail/format-address-for-delivery.ts';
  const rejected = [
    'ghost/core/server/lib/mail/ghost-mailer.js',
    'ghost/core/server/lib/mail/format-address-for-delivery-extra.ts',
  ] as const;
  const f = fixture(t, {
    [`${alpha}/approved.js`]: "require('../../lib/mail/format-address-for-delivery');",
    [`${alpha}/rejected.ts`]:
      "import '../../lib/mail/ghost-mailer'; import '../../lib/mail/format-address-for-delivery-extra';",
    [approved]: 'export const formatAddressForDelivery = (mailbox: unknown) => mailbox;',
    [rejected[0]]: 'module.exports = class GhostMailer {};',
    [rejected[1]]: 'export {};',
  });
  const graph = f.graph();
  assert.ok(
    edges(graph).some(([from, , to]) => from === `${alpha}/approved.js` && to === approved),
  );
  assert.deepEqual(
    violations(graph),
    rejected.map((to) => ['service-dependencies', `${alpha}/rejected.ts`, to]).sort(),
  );
});

it('allows the CSS inlining helper required by Staff without allowing its siblings', (t) => {
  const approved = 'ghost/core/server/lib/email-rendering/inline-css.ts';
  // finalize.ts is itself allowed for Member welcome emails, so the rejected siblings are
  // files with no allowance of their own.
  const rejected = [
    'ghost/core/server/lib/email-rendering/inline-css-extra.ts',
    'ghost/core/server/lib/email-rendering/render.ts',
  ] as const;
  const f = fixture(t, {
    [`${alpha}/approved.js`]: "require('../../lib/email-rendering/inline-css');",
    [`${alpha}/rejected.ts`]:
      "import '../../lib/email-rendering/inline-css-extra'; import '../../lib/email-rendering/render';",
    [approved]: 'export const inlineCss = (html: string) => html;',
    [rejected[0]]: 'export {};',
    [rejected[1]]: 'export {};',
  });
  const graph = f.graph();
  assert.ok(
    edges(graph).some(([from, , to]) => from === `${alpha}/approved.js` && to === approved),
  );
  assert.deepEqual(
    violations(graph),
    rejected.map((to) => ['service-dependencies', `${alpha}/rejected.ts`, to]).sort(),
  );
});

it('allows the Koenig default nodes entry required by Member welcome emails without allowing other exports', (t) => {
  const pkg = 'koenig/kg-default-nodes';
  const f = fixture(t, {
    [`${alpha}/approved.ts`]: "import '@tryghost/kg-default-nodes';",
    [`${alpha}/rejected.ts`]: "import '@tryghost/kg-default-nodes/visibility';",
    [`${pkg}/package.json`]: JSON.stringify({
      name: '@tryghost/kg-default-nodes',
      exports: {
        '.': { source: './src/index.ts', default: './build/cjs/index.js' },
        './visibility': { source: './src/visibility.ts', default: './build/cjs/visibility.js' },
      },
    }),
    [`${pkg}/src/index.ts`]: 'export const utils = {};',
    [`${pkg}/src/visibility.ts`]: 'export const visibility = {};',
  });
  f.link(pkg, 'node_modules/@tryghost/kg-default-nodes');
  const graph = f.graph();
  assert.ok(
    edges(graph).some(
      ([from, , to]) => from === `${alpha}/approved.ts` && to === `${pkg}/src/index.ts`,
    ),
  );
  assert.deepEqual(violations(graph), [
    ['service-dependencies', `${alpha}/rejected.ts`, `${pkg}/src/visibility.ts`],
  ]);
});

it('allows the email design computation required by Member welcome emails without allowing its siblings', (t) => {
  const approved = 'ghost/core/server/lib/email-rendering/email-design.js';
  const rejected = 'ghost/core/server/lib/email-rendering/email-design-extra.js';
  const f = fixture(t, {
    [`${alpha}/approved.js`]: "require('../../lib/email-rendering/email-design');",
    [`${alpha}/rejected.ts`]: "import '../../lib/email-rendering/email-design-extra';",
    [approved]: 'module.exports = { getEmailDesign() {} };',
    [rejected]: 'module.exports = {};',
  });
  const graph = f.graph();
  assert.ok(
    edges(graph).some(([from, , to]) => from === `${alpha}/approved.js` && to === approved),
  );
  assert.deepEqual(violations(graph), [['service-dependencies', `${alpha}/rejected.ts`, rejected]]);
});

it('allows the email finalizer required by Member welcome emails without allowing its siblings', (t) => {
  const approved = 'ghost/core/server/lib/email-rendering/finalize.ts';
  const rejected = 'ghost/core/server/lib/email-rendering/finalize-extra.ts';
  const f = fixture(t, {
    [`${alpha}/approved.ts`]: "import '../../lib/email-rendering/finalize';",
    [`${alpha}/rejected.ts`]: "import '../../lib/email-rendering/finalize-extra';",
    [approved]: 'export const finalize = () => ({});',
    [rejected]: 'export {};',
  });
  const graph = f.graph();
  assert.ok(
    edges(graph).some(([from, , to]) => from === `${alpha}/approved.ts` && to === approved),
  );
  assert.deepEqual(violations(graph), [['service-dependencies', `${alpha}/rejected.ts`, rejected]]);
});

it('allows the delivery address formatter required by Member welcome emails without allowing its siblings', (t) => {
  const approved = 'ghost/core/server/lib/mail/format-address-for-delivery.ts';
  const rejected = 'ghost/core/server/lib/mail/ghost-mailer.js';
  const f = fixture(t, {
    [`${alpha}/approved.ts`]: "import '../../lib/mail/format-address-for-delivery';",
    [`${alpha}/rejected.ts`]: "import '../../lib/mail/ghost-mailer';",
    [approved]: 'export const formatAddressForDelivery = () => "";',
    [rejected]: 'module.exports = class GhostMailer {};',
  });
  const graph = f.graph();
  assert.ok(
    edges(graph).some(([from, , to]) => from === `${alpha}/approved.ts` && to === approved),
  );
  assert.deepEqual(violations(graph), [['service-dependencies', `${alpha}/rejected.ts`, rejected]]);
});

it('allows each provider SDK only from its provider client, across Core and service roots', (t) => {
  const mpp = `${services}/machine-payments/adapters/mpp-adapter.ts`;
  const x402 = `${services}/machine-payments/adapters/x402-adapter.ts`;
  const stripeApi = `${services}/stripe/stripe-api.js`;
  const machineStripe = `${services}/machine-payments/stripe/payment-recorder.ts`;
  const oembed = `${services}/oembed/extract-oembed.ts`;
  const f = fixture(t, {
    [mpp]: "require('mppx/server');",
    [x402]:
      "require('@x402/core/server'); require('@x402/evm/exact/server'); require('@x402/hono'); require('hono');",
    [stripeApi]: "require('stripe');",
    [machineStripe]: "import 'stripe';",
    [oembed]: "import '@extractus/oembed-extractor';",
    // A type-only import of a provider SDK is not a dependency on it.
    [`${services}/members/types.ts`]: "import type Stripe from 'stripe';",
    // The same imports anywhere else fail, including in another file of the same
    // service, a service root and Core code outside services.
    [`${services}/machine-payments/service.ts`]: "import 'mppx/server'; import 'hono';",
    [`${services}/machine-payments/adapters/other.ts`]: "import '@x402/hono';",
    [`${services}/members/router.js`]: "require('stripe');",
    [`${services}/stripe/index.js`]: "require('stripe');",
    [`${services}/oembed/oembed-service.js`]: "require('@extractus/oembed-extractor');",
    'ghost/core/server/lib/payments.js': "require('stripe'); require('mppx/server');",
    // A package that only shares a name prefix is not a provider SDK.
    [`${services}/machine-payments/adapters/prefix.ts`]:
      "import 'stripe-extra'; import 'mppx-extra';",
  });
  for (const name of [
    'mppx',
    '@x402/core',
    '@x402/evm',
    '@x402/hono',
    'hono',
    'stripe',
    '@extractus/oembed-extractor',
    'stripe-extra',
    'mppx-extra',
  ]) {
    f.write(
      `node_modules/${name}/package.json`,
      JSON.stringify({
        name,
        main: 'index.js',
        exports: { '.': './index.js', './server': './server.js', './exact/server': './server.js' },
      }),
    );
    f.write(`node_modules/${name}/index.js`, 'module.exports = {};');
    f.write(`node_modules/${name}/server.js`, 'module.exports = {};');
  }
  const graph = f.graph('ghost/core');
  const provider = (from: string, to: string) => ['specialist-dependencies', from, to];
  assert.deepEqual(
    violations(graph),
    [
      provider(`${services}/machine-payments/service.ts`, 'node_modules/mppx/server.js'),
      provider(`${services}/machine-payments/service.ts`, 'node_modules/hono/index.js'),
      provider(
        `${services}/machine-payments/adapters/other.ts`,
        'node_modules/@x402/hono/index.js',
      ),
      provider(`${services}/members/router.js`, 'node_modules/stripe/index.js'),
      provider(`${services}/stripe/index.js`, 'node_modules/stripe/index.js'),
      provider(
        `${services}/oembed/oembed-service.js`,
        'node_modules/@extractus/oembed-extractor/index.js',
      ),
      provider('ghost/core/server/lib/payments.js', 'node_modules/stripe/index.js'),
      provider('ghost/core/server/lib/payments.js', 'node_modules/mppx/server.js'),
      [
        'service-dependencies',
        `${services}/machine-payments/adapters/prefix.ts`,
        'node_modules/stripe-extra/index.js',
      ],
      [
        'service-dependencies',
        `${services}/machine-payments/adapters/prefix.ts`,
        'node_modules/mppx-extra/index.js',
      ],
    ].sort(),
  );
  assert.equal(
    edges(graph).filter(
      ([from]) =>
        from !== undefined && [mpp, x402, stripeApi, machineStripe, oembed].includes(from),
    ).length,
    8,
  );
});

it('allows specialist dependencies only from their owning files and folders', (t) => {
  const csv = `${services}/content-import/csv/parse.ts`;
  const importer = 'ghost/core/server/data/importer/importers/importer-revue.js';
  const oembed = `${services}/oembed/nested/extract.ts`;
  const limits = `${services}/limits.ts`;
  const workspaceEntry = 'packages/limit-service/src/index.ts';
  const f = fixture(t, {
    [csv]: "import 'papaparse';",
    [importer]: "require('papaparse');",
    [oembed]: "import 'jsonrepair'; import 'chrono-node';",
    [limits]: "import '../../../../packages/limit-service/src/index';",
    [workspaceEntry]: 'export {};',
    // Owned elsewhere: another file in the same service, another service, Core
    // code outside services and a service root.
    [`${services}/content-import/import/rows.ts`]: "import 'papaparse';",
    [`${services}/members/parse.js`]: "require('jsonrepair');",
    'ghost/core/server/lib/dates.js': "require('chrono-node');",
    [`${services}/members/index.js`]: "require('../../../../../packages/limit-service/src/index');",
    // A type-only import is not a dependency.
    [`${services}/members/types.ts`]: "import type Papa from 'papaparse';",
  });
  for (const name of ['papaparse', 'jsonrepair', 'chrono-node']) {
    f.write(`node_modules/${name}/package.json`, JSON.stringify({ name, main: 'index.js' }));
    f.write(`node_modules/${name}/index.js`, 'module.exports = {};');
  }
  const graph = f.graph('ghost/core');
  assert.deepEqual(
    violations(graph),
    [
      [`${services}/content-import/import/rows.ts`, 'node_modules/papaparse/index.js'],
      [`${services}/members/parse.js`, 'node_modules/jsonrepair/index.js'],
      ['ghost/core/server/lib/dates.js', 'node_modules/chrono-node/index.js'],
      [`${services}/members/index.js`, workspaceEntry],
    ]
      .map(([from, to]) => ['specialist-dependencies', from, to])
      .sort(),
  );
  assert.equal(
    edges(graph).filter(
      ([from]) => from !== undefined && [csv, importer, oembed, limits].includes(from),
    ).length,
    5,
  );
});

it('allows the API framework only from the API and web layers', (t) => {
  const entry = 'packages/api-framework/src/index.ts';
  const endpoint = 'ghost/core/server/api/endpoints/posts.js';
  const routes = 'ghost/core/server/web/api/endpoints/admin/routes.js';
  const f = fixture(t, {
    [entry]: 'export {};',
    [endpoint]: "require('../../../../../packages/api-framework/src/index');",
    [routes]: "require('../../../../../../../packages/api-framework/src/index');",
    [`${services}/webhooks/serialize.js`]:
      "require('../../../../../packages/api-framework/src/index');",
    'ghost/core/server/lib/frames.js': "require('../../../../packages/api-framework/src/index');",
  });
  const graph = f.graph('ghost/core');
  assert.deepEqual(
    violations(graph),
    [`${services}/webhooks/serialize.js`, 'ghost/core/server/lib/frames.js']
      .map((from) => ['specialist-dependencies', from, entry])
      .sort(),
  );
  assert.equal(
    edges(graph).filter(([from, , to]) => [endpoint, routes].includes(from ?? '') && to === entry)
      .length,
    2,
  );
});

it('keeps a file owner when it is converted between JavaScript and TypeScript', (t) => {
  // The specialist list names the comment model as comment.js.
  const converted = 'ghost/core/server/models/comment.ts';
  const sibling = 'ghost/core/server/models/comment-extra.ts';
  const f = fixture(t, {
    [converted]: "import 'sanitize-html';",
    [sibling]: "import 'sanitize-html';",
  });
  f.write('node_modules/sanitize-html/package.json', '{"name":"sanitize-html","main":"index.js"}');
  f.write('node_modules/sanitize-html/index.js', 'module.exports = {};');
  const graph = f.graph('ghost/core');
  assert.equal(edges(graph).filter(([from]) => from === converted).length, 1);
  assert.deepEqual(violations(graph), [
    ['specialist-dependencies', sibling, 'node_modules/sanitize-html/index.js'],
  ]);
});

it('allows HTTP framework packages only in the web layer', (t) => {
  const owners = [
    'ghost/core/server/web/members/app.js',
    'ghost/core/frontend/web/site.js',
    'ghost/core/shared/express.js',
  ];
  const others = [`${services}/members/members-api.js`, 'ghost/core/server/lib/router.js'];
  const packages = ['express', 'body-parser', 'cookies', 'on-headers', 'cors', 'multer'];
  const source = packages.map((name) => `require('${name}');`).join('\n');
  const f = fixture(t, Object.fromEntries([...owners, ...others].map((file) => [file, source])));
  for (const name of packages) {
    f.write(`node_modules/${name}/package.json`, JSON.stringify({ name, main: 'index.js' }));
    f.write(`node_modules/${name}/index.js`, 'module.exports = {};');
  }
  const graph = f.graph('ghost/core');
  assert.equal(
    edges(graph).filter(([from]) => owners.includes(from ?? '')).length,
    owners.length * packages.length,
  );
  assert.deepEqual(
    violations(graph),
    others
      .flatMap((from) =>
        packages.map((name) => ['specialist-dependencies', from, `node_modules/${name}/index.js`]),
      )
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

it('rejects committed JavaScript beside TypeScript of the same name, which the scan skips as build output', (t) => {
  const f = fixture(t, {
    [`${alpha}/index.ts`]: 'export {};',
    [`${alpha}/implementation.ts`]: 'export {};',
    // Node loads these instead of the TypeScript beside them.
    [`${alpha}/index.js`]: "require('../../../shared/config');",
    [`${alpha}/implementation.js`]: "require('../../../shared/config');",
  });
  const git = (...args: string[]) => {
    const result = spawnSync('git', args, { cwd: f.root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  // The scan skips both files, so it reports no violation.
  assert.deepEqual(violations(f.graph()), []);
  // Uncommitted build output is expected and passes.
  const built = f.lint();
  assert.equal(built.status, 0, built.stderr);
  git('init', '-q');
  git('add', 'ghost');
  const committed = f.lint();
  assert.equal(committed.status, 1, committed.stderr);
  for (const file of ['index', 'implementation']) {
    assert.match(
      committed.stderr,
      new RegExp(`committed build output: ${alpha}/${file}\\.js sits beside ${alpha}/${file}\\.ts`),
    );
  }
  // The commit hook passes only the staged files and still reports it.
  const staged = f.lint([`${alpha}/implementation.js`]);
  assert.equal(staged.status, 1, staged.stderr);
  git('rm', '-q', '--cached', `${alpha}/index.js`, `${alpha}/implementation.js`);
  assert.equal(f.lint().status, 0);
  for (const file of ['index', 'implementation']) {
    rmSync(path.join(f.root, `${alpha}/${file}.js`));
  }
  // Only the pairs the scan skips count: a .tsx file emits .js, never .mjs or .cjs.
  f.write(`${alpha}/view.tsx`, 'export {};');
  f.write(`${alpha}/view.mjs`, 'export {};');
  f.write(`${alpha}/view.cjs`, '');
  f.write(`${alpha}/module.mts`, 'export {};');
  f.write(`${alpha}/module.mjs`, 'export {};');
  git('add', 'ghost');
  assert.deepEqual(committedBuildOutput(f.root), [
    { file: `${alpha}/module.mjs`, source: `${alpha}/module.mts` },
  ]);
});

it('fails instead of passing when Git cannot list the tracked files', (t) => {
  const f = fixture(t, { [`${alpha}/index.ts`]: 'export {};' });
  // Not a repository: nothing is committed, so there is nothing to check.
  assert.deepEqual(committedBuildOutput(f.root), []);
  assert.equal(f.lint().status, 0);
  // A repository Git refuses to read must not look the same as a clean one.
  f.write('.git', 'not a gitfile');
  assert.throws(
    () => committedBuildOutput(f.root),
    /Could not list tracked files \(git exit \d+\)/,
  );
  const refused = f.lint();
  assert.equal(refused.status, 1, refused.stderr);
  assert.match(refused.stderr, /Could not list tracked files/);
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
  const graph = f.graph('apps');
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
  const built = f.graph('apps');
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
  for (const input of [
    'ghost/core/**/*',
    'ghost/package.json',
    'packages/**/*',
    'contracts/**/*',
    'koenig/**/*',
    '.dependency-cruiser-known-violations.json',
    'tools/scripts/lib/dependency-boundaries.ts',
    'tools/configs/oxlint/legacy-services.ts',
    'tools/scripts/ci/check-boundaries.ts',
  ]) {
    assert.ok(root.nx.targets['lint:boundaries'].inputs.includes(`{workspaceRoot}/${input}`));
  }
  assert.equal(root.scripts['lint:boundaries'], 'node tools/scripts/ci/check-boundaries.ts');
  assert.equal(root.nx.targets['lint:boundaries'].options.command, root.scripts['lint:boundaries']);
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
