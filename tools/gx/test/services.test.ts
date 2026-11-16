import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { buildServiceReport, frequencies } from '../services.ts';
import {
  legacyInventoryFile,
  servicesRoot as services,
} from '../../configs/oxlint/legacy-services.ts';

const assessment = {
  complexity: 'straightforward',
  modelImpact: 'fits',
  reason: 'Boot can own initialization without changing the model.',
  reviewedAt: '0123456789012345678901234567890123456789',
};
function entry(overrides = {}) {
  return {
    kind: 'directory',
    disposition: 'migrate',
    migration: {
      ...assessment,
      dependencies: {
        ...assessment,
        reason: 'Inject the configured client.',
        preparation: ['Move client construction to the factory.'],
      },
    },
    blockers: ['Check failure recovery before migrating.'],
    unverified: ['startup'],
    ...overrides,
  };
}
function audit(names: string[], violations: unknown[] = []) {
  return {
    modules: names.map((name) => ({ source: `${services}/${name}/index.ts` })),
    summary: { violations },
  };
}
function finding(from: string, to: string, rule = 'service-dependencies', extra = {}) {
  return { from: `${services}/${from}`, to, rule: { name: rule }, ...extra };
}

test('reports ownership independently of migration status and combines both assessments', () => {
  const entries = {
    relocate: entry({ disposition: 'relocate' }),
    review: entry({ disposition: 'review' }),
    split: entry({ disposition: 'split' }),
    lifecycle: entry({
      migration: { ...entry().migration, complexity: 'complex' },
    }),
    dependencies: entry({
      migration: {
        ...entry().migration,
        dependencies: { ...entry().migration.dependencies, complexity: 'complex' },
      },
    }),
    straight: entry(),
  };
  // A service on disk that the inventory does not list is standard.
  const rows = buildServiceReport(
    { services: entries },
    audit([...Object.keys(entries), 'standard']),
  );
  assert.deepEqual(
    Object.fromEntries(rows.map(({ name, migrationStatus }) => [name, migrationStatus])),
    {
      dependencies: 'Needs preparation',
      lifecycle: 'Needs preparation',
      relocate: 'Straightforward',
      review: 'Straightforward',
      split: 'Straightforward',
      standard: 'Standard',
      straight: 'Straightforward',
    },
  );
  assert.equal(rows.find(({ name }) => name === 'split')?.ownership, 'Split');
  assert.equal(rows.find(({ name }) => name === 'relocate')?.ownership, 'Relocate');
  assert.equal(rows.find(({ name }) => name === 'review')?.ownership, 'Undecided');
  assert.equal(rows.find(({ name }) => name === 'standard')?.ownership, 'Standard');
  assert.equal(rows.find(({ name }) => name === 'standard')?.entry, undefined);
  assert.deepEqual(rows.find(({ name }) => name === 'straight')?.dependencies, []);
});

test('counts distinct dependency targets while preserving file and rule evidence', () => {
  const logging = {
    unresolvedTo: '@tryghost/logging',
    dependencyTypes: ['npm', 'npm-dep'],
  };
  const rows = buildServiceReport(
    { services: { alpha: entry() } },
    audit(
      ['alpha'],
      [
        finding('alpha/a.ts', '/store/one/logging/index.js', 'service-dependencies', logging),
        finding('alpha/b.ts', '/store/two/logging/index.js', 'service-dependencies', logging),
        finding('alpha/a.ts', 'ghost/core/shared/config.ts'),
        finding('alpha/b.ts', 'ghost/core/shared/config.ts'),
        finding('alpha/a.ts', 'missing-client'),
        finding('alpha/a.ts', 'missing-client', 'service-unresolved'),
        finding('alpha/b.ts', `${services}/alpha/index.ts`, 'service-own-root'),
        finding('alpha/a.ts', 'ignore-me', 'unrelated-rule'),
      ],
    ),
  );
  const row = rows[0];
  assert.ok(row);
  assert.deepEqual(row.dependencies, [
    '@tryghost/logging',
    'ghost/core/shared/config.ts',
    'missing-client',
  ]);
  assert.equal(row.unresolved, 1);
  assert.equal(row.ownRoot, 1);
  assert.equal(row.findings.length, 7);
  assert.ok(
    row.findings.some(
      ({ from, to, rule }) =>
        from === `${services}/alpha/a.ts` &&
        to === 'missing-client' &&
        rule === 'service-unresolved',
    ),
  );
});

test('distinguishes unanalysed entries from zero violations and treats unlisted roots as standard', () => {
  const result = buildServiceReport(
    { services: { absent: entry(), clean: entry() } },
    {
      modules: [
        { source: `${services}/clean/index.ts` },
        { source: `${services}/unknown/worker.ts` },
        { source: `${services}/legacy.js` },
        { source: `${services}/absent/index.ts`, couldNotResolve: true },
        { source: 'ghost/core/shared/config.ts' },
      ],
      summary: { violations: [] },
    },
  );
  assert.deepEqual(
    result.map(({ name }) => name),
    ['absent', 'clean', 'legacy.js', 'unknown'],
  );
  const absent = result.find(({ name }) => name === 'absent');
  assert.ok(absent);
  assert.equal(absent.analyzed, false);
  assert.equal(absent.dependencies, null);
  assert.equal(absent.unresolved, null);
  assert.equal(absent.ownRoot, null);
  assert.equal(result.find(({ name }) => name === 'clean')?.analyzed, true);
  assert.deepEqual(result.find(({ name }) => name === 'clean')?.dependencies, []);
  assert.equal(result.find(({ name }) => name === 'unknown')?.ownership, 'Standard');
  assert.equal(result.find(({ name }) => name === 'unknown')?.migrationStatus, 'Standard');
});

test('rejects incomplete assessments and invalid audit data instead of reporting a clean result', () => {
  for (const invalid of [
    {},
    { services: { alpha: entry({ disposition: 'unknown' }) } },
    { services: { alpha: entry({ migration: assessment }) } },
    {
      services: {
        alpha: entry({ migration: { ...entry().migration, modelImpact: 'not-applicable' } }),
      },
    },
  ]) {
    assert.throws(() => buildServiceReport(invalid, audit(['alpha'])));
  }
  for (const invalid of [{}, { modules: [], summary: {} }, audit(['alpha'], [{ from: 42 }])]) {
    assert.throws(() => buildServiceReport({ services: { alpha: entry() } }, invalid));
  }
});

test('classifies each rejected dependency by the first decision that matches it', () => {
  const [alpha] = buildServiceReport(
    { services: { alpha: entry() } },
    audit(
      ['alpha'],
      [
        finding('alpha/a.ts', 'ghost/core/shared/labs.js'),
        finding('alpha/a.ts', 'lodash'),
        finding('alpha/a.ts', 'lodash/pick'),
        finding('alpha/a.ts', `${services}/beta/index.ts`),
        finding('alpha/a.ts', `${services}/alpha/index.ts`, 'service-own-root'),
        finding('alpha/a.ts', './missing', 'service-unresolved'),
        finding('alpha/a.ts', 'node_modules/stripe/index.js', 'specialist-dependencies', {
          unresolvedTo: 'stripe',
          dependencyTypes: ['npm'],
        }),
        finding('alpha/registry.ts', `${services}/beta/beta-job.ts`),
        finding('alpha/a.ts', `${services}/beta/other-job.ts`),
      ],
    ),
    {
      inject: ['^ghost/core/shared/labs\\.js$', `^${services}/`],
      importForm: ['^lodash$', '^ghost/core/shared/labs\\.js$'],
      deferred: [
        { from: '/alpha/registry\\.ts$', to: '-job\\.ts$', until: 'Registration moves to boot' },
      ],
    },
  );
  assert.deepEqual(
    alpha?.findings.map(({ to, kind }) => [to, kind]),
    [
      ['ghost/core/shared/labs.js', 'inject'],
      ['lodash', 'import-form'],
      ['lodash/pick', 'no-decision'],
      [`${services}/beta/index.ts`, 'inject'],
      [`${services}/alpha/index.ts`, undefined],
      ['./missing', undefined],
      ['stripe', 'import-form'],
      [`${services}/beta/beta-job.ts`, 'deferred'],
      [`${services}/beta/other-job.ts`, 'inject'],
    ],
  );
  assert.equal(
    alpha?.findings.find(({ to }) => to.endsWith('beta-job.ts'))?.until,
    'Registration moves to boot',
  );
  // Distinct rejected targets include specialist dependencies outside their owners.
  assert.ok(alpha?.dependencies?.includes('stripe'));
  assert.throws(() =>
    buildServiceReport({ services: { alpha: entry() } }, audit(['alpha']), { inject: ['^a$'] }),
  );
  // A deferral must name the refactor it waits for.
  assert.throws(() =>
    buildServiceReport({ services: { alpha: entry() } }, audit(['alpha']), {
      inject: [],
      importForm: [],
      deferred: [{ from: 'a', to: 'b', until: '' }],
    }),
  );
});

test('counts each dependency separately for each kind it has', () => {
  const rows = buildServiceReport(
    { services: { alpha: entry() } },
    audit(
      ['alpha'],
      [
        finding('alpha/registry.ts', `${services}/beta/beta-job.ts`),
        finding('alpha/other.ts', `${services}/beta/beta-job.ts`),
        finding('alpha/third.ts', `${services}/beta/beta-job.ts`),
      ],
    ),
    {
      inject: [`^${services}/`],
      importForm: [],
      deferred: [
        { from: '/alpha/registry\\.ts$', to: '-job\\.ts$', until: 'Registration moves to boot' },
      ],
    },
  );
  assert.deepEqual(
    frequencies(rows).map(({ dependency, kind, files }) => [dependency, kind, files]),
    [
      [`${services}/beta/beta-job.ts`, 'inject', 2],
      [`${services}/beta/beta-job.ts`, 'deferred', 1],
    ],
  );
});

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'ghost-gx-services-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const write = async (file: string, source: string) => {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), source);
  };
  await mkdir(join(root, 'tools/gx'), { recursive: true });
  for (const file of ['cli.ts', 'services.ts', 'run-ghost-command.ts']) {
    await cp(new URL(`../${file}`, import.meta.url), join(root, 'tools/gx', file));
  }
  await cp(
    new URL('../../../.dependency-cruiser.cjs', import.meta.url),
    join(root, '.dependency-cruiser.cjs'),
  );
  for (const file of [
    'tools/scripts/ci/service-dependency-resolver.mjs',
    'tools/scripts/lib/dependency-boundaries.ts',
    'tools/configs/oxlint/legacy-services.ts',
    'tools/scripts/ci/check-boundaries.ts',
  ]) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await cp(new URL(`../../../${file}`, import.meta.url), join(root, file));
  }
  await write('.dependency-cruiser-known-violations.json', '[]');
  await write('apps/empty.ts', 'export {};');
  await write('package.json', '{"type":"module"}');
  await symlink(new URL('../node_modules', import.meta.url), join(root, 'node_modules'));
  await write(legacyInventoryFile, JSON.stringify({ services: { alpha: entry() } }));
  await write(`${services}/alpha/index.ts`, 'export {};');
  await write(`${services}/alpha/implementation.ts`, "import '../../../shared/client.js';");
  await write(`${services}/alpha/second.ts`, "import '../../../shared/client.js';");
  await write('ghost/core/shared/client.js', 'export const client = {};');
  return {
    root,
    write,
    run(args: string[]) {
      return spawnSync(process.execPath, [join(root, 'tools/gx/cli.ts'), 'services', ...args], {
        cwd: tmpdir(),
        encoding: 'utf8',
      });
    },
  };
}

test('CLI reports classifications, per-service evidence and distinct dependency frequencies', async (t) => {
  const f = await fixture(t);
  const summary = f.run(['report', '--json']);
  assert.equal(summary.status, 0, summary.stderr);
  assert.deepEqual(JSON.parse(summary.stdout), {
    'Legacy entries': 1,
    'Standard services': 0,
    'Left to migrate': 1,
    Relocate: 0,
    Split: 0,
    Undecided: 0,
    'Needs preparation': 0,
    'Straightforward migrations': 1,
    'Straightforward — dependency violations': 1,
    'Straightforward — no dependency violations': 0,
    'Legacy entries with dependency violations': 1,
    'Left to migrate with dependency violations': 1,
    'Standard services with dependency violations': 0,
    'Not analyzed': 0,
    'Dependency violations': {
      'Instances to inject': 0,
      'Wrong import form': 0,
      'Deferred to a planned refactor': 0,
      'No decision yet': 2,
      Total: 2,
    },
  });
  const listing = f.run(['list', '--json']);
  assert.equal(listing.status, 0, listing.stderr);
  const rows = buildServiceReport(
    { services: { alpha: entry() } },
    audit(
      ['alpha'],
      [
        finding('alpha/implementation.ts', 'ghost/core/shared/client.js'),
        finding('alpha/second.ts', 'ghost/core/shared/client.js'),
      ],
    ),
  );
  assert.deepEqual(JSON.parse(listing.stdout), rows);
  const details = f.run(['report', 'alpha']);
  assert.equal(details.status, 0, details.stderr);
  for (const value of [
    'alpha',
    'Straightforward',
    assessment.reason,
    assessment.reviewedAt,
    'Move client construction to the factory.',
    'Check failure recovery before migrating.',
    'Unverified contracts: startup',
    `${services}/alpha/implementation.ts`,
    'ghost/core/shared/client.js',
  ]) {
    assert.ok(details.stdout.includes(value), value);
  }
  assert.doesNotMatch(details.stdout, /Inventory notes:/);
  const jsonDetails = f.run(['report', 'alpha', '--json']);
  assert.equal(jsonDetails.status, 0, jsonDetails.stderr);
  assert.deepEqual(JSON.parse(jsonDetails.stdout), rows[0]);
  const ranked = f.run(['dependencies', '--json']);
  assert.equal(ranked.status, 0, ranked.stderr);
  assert.deepEqual(JSON.parse(ranked.stdout), [
    { dependency: 'ghost/core/shared/client.js', files: 2, kind: 'no-decision' },
  ]);
  const markdown = f.run(['audit', '--output-type', 'markdown']);
  assert.equal(markdown.status, 0, markdown.stderr);
  assert.match(markdown.stdout, /Forbidden dependency check/);
  assert.ok(markdown.stdout.includes(`${services}/alpha/implementation.ts`));
  const output = join(f.root, 'report.json');
  const saved = f.run(['audit', '--output-type', 'json', '--output-to', output]);
  assert.equal(saved.status, 0, saved.stderr);
  assert.equal(saved.stdout, '');
  const savedRows = buildServiceReport(
    { services: { alpha: entry() } },
    JSON.parse(await readFile(output, 'utf8')),
  );
  assert.deepEqual(savedRows, rows);
  const unknown = f.run(['report', 'nonexistent']);
  assert.equal(unknown.status, 1);
  assert.equal(unknown.stdout, '');
  assert.match(unknown.stderr, /Unknown service: nonexistent/);
});

test('CLI groups rejected dependencies by the decisions in the boundary config', async (t) => {
  const f = await fixture(t);
  await f.write(
    `${services}/alpha/third.ts`,
    "import '../../../shared/labs.js'; import '../../../shared/client.js';",
  );
  await f.write('ghost/core/shared/labs.js', 'export const labs = {};');
  const summary = f.run(['report', '--json']);
  assert.equal(summary.status, 0, summary.stderr);
  const violations = JSON.parse(summary.stdout)['Dependency violations'];
  assert.deepEqual(violations, {
    'Instances to inject': 1,
    'Wrong import form': 0,
    'Deferred to a planned refactor': 0,
    'No decision yet': 3,
    Total: 4,
  });
  const text = f.run(['report']);
  assert.match(text.stdout, /^Instances to inject\s+1\s+inject$/m);
  assert.match(text.stdout, /^No decision yet\s+3\s+no-decision$/m);
  assert.match(text.stdout, /^Total\s+4$/m);

  const all = f.run(['dependencies']);
  assert.match(all.stdout, /^FILES\s+KIND\s+DEPENDENCY$/m);
  assert.match(all.stdout, /^3\s+no-decision\s+ghost\/core\/shared\/client\.js$/m);
  const inject = f.run(['dependencies', '--kind', 'inject', '--json']);
  assert.equal(inject.status, 0, inject.stderr);
  assert.deepEqual(JSON.parse(inject.stdout), [
    { dependency: 'ghost/core/shared/labs.js', files: 1, kind: 'inject' },
  ]);
  const details = f.run(['report', 'alpha']);
  assert.ok(details.stdout.includes('ghost/core/shared/labs.js [service-dependencies, inject]'));

  const help = f.run(['dependencies', '--help']);
  for (const kind of ['inject', 'import-form', 'deferred', 'no-decision']) {
    assert.ok(help.stdout.includes(kind), kind);
  }
  for (const [command, args] of [
    ['dependencies', ['--kind', 'nonexistent']],
    ['report', ['--kind', 'inject']],
    ['list', ['--kind', 'inject']],
  ] as const) {
    const invalid = f.run([command, ...args]);
    assert.equal(invalid.status, 1, command);
    assert.equal(invalid.stdout, '', command);
    assert.match(invalid.stderr, /kind/, command);
  }

  // A config without the decisions cannot produce a report that calls everything undecided.
  const config = await readFile(join(f.root, '.dependency-cruiser.cjs'), 'utf8');
  const withoutDecisions = config.replace(
    /\nObject\.defineProperties?\(module\.exports[\s\S]*$/,
    '\n',
  );
  assert.notEqual(withoutDecisions, config);
  await f.write('.dependency-cruiser.cjs', withoutDecisions);
  const missing = f.run(['report']);
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, '');
  assert.match(missing.stderr, /serviceDependencyDecisions/);
});

test('planned splits show runtime-service notes ahead of older migration assessments', async (t) => {
  const f = await fixture(t);
  const notes =
    '\n  This is a configured runtime service. Split its parser out before moving the service.  \n';
  const planned = entry({ disposition: 'split', notes });
  await f.write(legacyInventoryFile, JSON.stringify({ services: { alpha: planned } }));
  const summary = f.run(['report', '--json']);
  assert.equal(summary.status, 0, summary.stderr);
  const counts = JSON.parse(summary.stdout);
  assert.equal(counts['Legacy entries'], 1);
  assert.equal(counts.Split, 1);
  assert.equal(counts['Standard services'], 0);
  assert.equal(counts['Straightforward migrations'], 0);

  const listing = f.run(['list', '--group', 'split', '--json']);
  assert.equal(listing.status, 0, listing.stderr);
  const rows = JSON.parse(listing.stdout);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'alpha');
  assert.equal(rows[0].ownership, 'Split');
  assert.equal(rows[0].migrationStatus, 'Straightforward');
  assert.equal(rows[0].entry.notes, notes);
  assert.equal(rows[0].entry.migration.complexity, 'straightforward');
  const jsonDetails = f.run(['report', 'alpha', '--json']);
  assert.equal(jsonDetails.status, 0, jsonDetails.stderr);
  assert.deepEqual(JSON.parse(jsonDetails.stdout), rows[0]);

  const details = f.run(['report', 'alpha']);
  assert.equal(details.status, 0, details.stderr);
  assert.ok(details.stdout.includes(`Inventory notes:\n${notes.trim()}`));
  assert.ok(details.stdout.includes(assessment.reason));
  assert.ok(details.stdout.indexOf(notes.trim()) < details.stdout.indexOf('Overall assessment'));

  await f.write(
    legacyInventoryFile,
    JSON.stringify({ services: { alpha: entry({ notes: ' \n  ' }) } }),
  );
  const blank = f.run(['report', 'alpha']);
  assert.equal(blank.status, 0, blank.stderr);
  assert.doesNotMatch(blank.stdout, /Inventory notes:/);
});

test('suggested future homes are shown without changing the disposition', async (t) => {
  const f = await fixture(t);
  const futureHome = 'core/server/auth/alpha';
  await f.write(
    legacyInventoryFile,
    JSON.stringify({ services: { alpha: entry({ futureHome }) } }),
  );
  const listing = f.run(['list', '--group', 'to-migrate', '--json']);
  assert.equal(listing.status, 0, listing.stderr);
  const rows = JSON.parse(listing.stdout);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].ownership, 'Migrate');
  assert.equal(rows[0].entry.futureHome, futureHome);

  const details = f.run(['report', 'alpha']);
  assert.equal(details.status, 0, details.stderr);
  assert.ok(details.stdout.includes(`Suggested future home (after this migration): ${futureHome}`));
});

test('list filters match every report group, including unknown analysis and every violation type', async (t) => {
  const f = await fixture(t);
  const entries = {
    absent: entry(),
    alpha: entry(),
    clean: entry(),
    moved: entry({ disposition: 'split' }),
    reviewRefactor: entry({
      disposition: 'review',
      migration: { ...entry().migration, complexity: 'complex', modelImpact: 'may-change' },
    }),
    own: entry(),
    prepare: entry({ migration: { ...entry().migration, complexity: 'complex' } }),
    relocate: entry({ disposition: 'relocate' }),
    review: entry({ disposition: 'review' }),
    unresolved: entry(),
  };
  // done and drift are on disk and not listed, so they are standard.
  const standard = ['done', 'drift'];
  await f.write(legacyInventoryFile, JSON.stringify({ services: entries }));
  for (const name of [...Object.keys(entries), ...standard].filter(
    (candidate) => candidate !== 'absent',
  )) {
    await f.write(`${services}/${name}/index.ts`, 'export const value = 1;');
  }
  for (const name of ['drift', 'relocate']) {
    await f.write(`${services}/${name}/worker.ts`, "import '../../../shared/client.js';");
  }
  await f.write(
    `${services}/own/worker.ts`,
    "import { value } from './index'; console.log(value);",
  );
  await f.write(`${services}/unresolved/worker.ts`, "import './missing.ts';");
  const all = f.run(['list', '--json']);
  assert.equal(all.status, 0, all.stderr);
  const rows = JSON.parse(all.stdout) as ReturnType<typeof buildServiceReport>;
  const own = rows.find(({ name }) => name === 'own');
  assert.deepEqual(own?.dependencies, []);
  assert.equal(own?.ownRoot, 1);
  assert.equal(rows.find(({ name }) => name === 'unresolved')?.unresolved, 1);

  const groups: [string, string, string[]][] = [
    ['legacy', 'Legacy entries', Object.keys(entries)],
    ['standard', 'Standard services', standard],
    ['to-migrate', 'Left to migrate', ['absent', 'alpha', 'clean', 'own', 'prepare', 'unresolved']],
    ['relocate', 'Relocate', ['relocate']],
    ['split', 'Split', ['moved']],
    ['undecided', 'Undecided', ['review', 'reviewRefactor']],
    ['needs-preparation', 'Needs preparation', ['prepare']],
    [
      'straightforward',
      'Straightforward migrations',
      ['absent', 'alpha', 'clean', 'own', 'unresolved'],
    ],
    [
      'straightforward-with-violations',
      'Straightforward — dependency violations',
      ['alpha', 'own', 'unresolved'],
    ],
    ['straightforward-clear', 'Straightforward — no dependency violations', ['clean']],
    [
      'legacy-with-violations',
      'Legacy entries with dependency violations',
      ['alpha', 'own', 'relocate', 'unresolved'],
    ],
    [
      'to-migrate-with-violations',
      'Left to migrate with dependency violations',
      ['alpha', 'own', 'unresolved'],
    ],
    ['standard-with-violations', 'Standard services with dependency violations', ['drift']],
    ['not-analyzed', 'Not analyzed', ['absent']],
  ];
  const report = f.run(['report']);
  assert.equal(report.status, 0, report.stderr);
  const [reportTable, ...footer] = report.stdout.trimEnd().split('\n\n');
  const [header, ...reportRows] = reportTable!.split('\n');
  assert.match(header!, /^MIGRATION\s+COUNT\s+GROUP$/);
  assert.equal(reportRows.length, groups.length - 1);
  assert.doesNotMatch(report.stdout, /Not analyzed|Not inventoried/);
  assert.match(report.stdout, /\s+relocate\nSplit\s+1\s+split\n/);
  assert.deepEqual(footer, [
    'List a group: pnpm gx services list --group <group>',
    [
      'DEPENDENCY VIOLATIONS           COUNT  KIND',
      'Instances to inject             0      inject',
      'Wrong import form               0      import-form',
      'Deferred to a planned refactor  0      deferred',
      'No decision yet                 5      no-decision',
      'Total                           5',
    ].join('\n'),
    'List a kind: pnpm gx services dependencies --kind <kind>',
  ]);
  const summary = f.run(['report', '--json']);
  assert.equal(summary.status, 0, summary.stderr);
  // Own-root and unresolved imports are counted per service, not as rejected dependencies.
  const { 'Dependency violations': violations, ...counts } = JSON.parse(summary.stdout);
  assert.equal(violations.Total, 5);
  assert.equal(Object.keys(counts).length, groups.length);
  assert.equal(
    counts['Legacy entries'],
    counts['Left to migrate'] + counts.Relocate + counts.Split + counts.Undecided,
  );
  assert.equal(rows.length, counts['Legacy entries'] + counts['Standard services']);
  assert.equal(
    counts['Left to migrate'],
    counts['Needs preparation'] + counts['Straightforward migrations'],
  );
  const reviewDetails = f.run(['report', 'reviewRefactor']);
  assert.equal(reviewDetails.status, 0, reviewDetails.stderr);
  assert.match(reviewDetails.stdout, /Undecided\s+Needs preparation/);
  for (const [group, label, names] of groups) {
    const result = f.run(['list', '--group', group, '--json']);
    assert.equal(result.status, 0, `${group}: ${result.stderr}`);
    assert.deepEqual(
      JSON.parse(result.stdout),
      rows.filter(({ name }) => names.includes(name)),
      group,
    );
    assert.equal(counts[label], names.length, group);
    const line = reportRows.find((row) => row.endsWith(`  ${group}`));
    if (group === 'not-analyzed') {
      assert.equal(line, undefined);
      continue;
    }
    assert.ok(line, `${group} is discoverable next to its report count`);
    assert.deepEqual(line.split(/ {2,}/), [label, String(names.length), group]);
    assert.equal(line.indexOf(String(names.length), label.length), header!.indexOf('COUNT'));
    assert.equal(line.lastIndexOf(group), header!.indexOf('GROUP'));
  }
  const clean = f.run(['list', '--group=straightforward-clear']);
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /^SERVICE\s+OWNERSHIP\s+MIGRATION/m);
  assert.match(clean.stdout, /^clean\s+Migrate\s+Straightforward\s+0\s+0\s+0$/m);
  assert.doesNotMatch(clean.stdout, /^(?:absent|alpha|own|unresolved)\s+/m);
});

test('empty groups preserve list headers and return an empty JSON array', async (t) => {
  const f = await fixture(t);
  const empty = f.run(['list', '--group', 'standard']);
  assert.equal(empty.status, 0, empty.stderr);
  assert.match(
    empty.stdout,
    /^SERVICE\s+OWNERSHIP\s+MIGRATION\s+DISALLOWED DEPS\s+UNRESOLVED\s+OWN ROOT/m,
  );
  assert.doesNotMatch(empty.stdout, /^alpha\s+/m);
  const json = f.run(['list', '--group', 'standard', '--json']);
  assert.equal(json.status, 0, json.stderr);
  assert.deepEqual(JSON.parse(json.stdout), []);
});

test('CLI help needs no audit and analyzer failures cannot produce clean reports', async (t) => {
  const f = await fixture(t);
  await f.write('.dependency-cruiser.cjs', "throw new Error('Broken audit configuration');");
  for (const command of ['list', 'report', 'dependencies', 'audit']) {
    const help = f.run([command, '--help']);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /Usage:/i);
    const failed = f.run([command]);
    assert.notEqual(failed.status, 0);
    assert.equal(failed.stdout, '');
    assert.match(failed.stderr, /Broken audit configuration/);
  }
});

test('reports and boundary lint share the graph and known-violations file', async (t) => {
  const f = await fixture(t);
  await f.write(
    '.dependency-cruiser-known-violations.json',
    JSON.stringify(
      ['implementation', 'second'].map((name) => ({
        rule: 'service-dependencies',
        from: `${services}/alpha/${name}.ts`,
        to: 'ghost/core/shared/client.js',
      })),
    ),
  );
  const lint = () =>
    spawnSync(process.execPath, [join(f.root, 'tools/scripts/ci/check-boundaries.ts')], {
      cwd: tmpdir(),
      encoding: 'utf8',
    });
  assert.equal(lint().status, 0);
  const report = f.run(['report', 'alpha', '--json']);
  assert.equal(report.status, 0, report.stderr);
  assert.equal(JSON.parse(report.stdout).findings.length, 2);
  await f.write('apps/portal/forbidden.ts', "import '../admin-x-framework/implementation';");
  await f.write('apps/admin-x-framework/implementation.ts', 'export {};');
  const auditResult = f.run(['audit', '--output-type', 'json']);
  assert.equal(auditResult.status, 0, auditResult.stderr);
  const graph = JSON.parse(auditResult.stdout);
  assert.equal(graph.summary.violations.length, 3);
  const invalid = lint();
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /public-apps-not-admin-libs/);

  // Deleting the legacy entry makes alpha standard, so it cannot keep known violations.
  await f.write(legacyInventoryFile, JSON.stringify({ services: {} }));
  for (const command of ['report', 'audit']) {
    const invalidReport = f.run([command]);
    assert.equal(invalidReport.status, 1);
    assert.match(invalidReport.stderr, /does not belong to a legacy service/);
  }
});

test('list help describes groups and invalid filters fail before the audit runs', async (t) => {
  const f = await fixture(t);
  await f.write('.dependency-cruiser.cjs', "throw new Error('Audit must not run');");
  const help = f.run(['list', '--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--group/);
  for (const group of [
    'legacy',
    'standard',
    'to-migrate',
    'relocate',
    'split',
    'undecided',
    'needs-preparation',
    'straightforward',
    'straightforward-with-violations',
    'straightforward-clear',
    'legacy-with-violations',
    'to-migrate-with-violations',
    'standard-with-violations',
    'not-analyzed',
  ]) {
    assert.ok(help.stdout.includes(group), group);
  }
  assert.ok(help.stdout.includes('Straightforward — no dependency violations'));
  const invalid = f.run(['list', '--group', 'nonexistent']);
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, '');
  assert.match(invalid.stderr, /[Uu]nknown.*group.*nonexistent/);
  assert.doesNotMatch(invalid.stderr, /Audit must not run/);
  const missing = f.run(['list', '--group']);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /--group/);
  assert.doesNotMatch(missing.stderr, /Audit must not run/);
  for (const command of ['report', 'dependencies']) {
    const result = f.run([command, '--group', 'standard']);
    assert.equal(result.status, 1, command);
    assert.equal(result.stdout, '', command);
    assert.match(result.stderr, /--group/, command);
    assert.doesNotMatch(result.stderr, /Audit must not run/, command);
  }
});
