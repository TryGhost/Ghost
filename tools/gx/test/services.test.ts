import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { buildServiceReport } from '../services.ts';

const services = 'ghost/core/server/services';
const assessment = {
  complexity: 'straightforward',
  modelImpact: 'fits',
  reason: 'Boot can own initialization without changing the model.',
  reviewedAt: '0123456789012345678901234567890123456789',
};
function entry(overrides = {}) {
  return {
    kind: 'directory',
    disposition: 'retain',
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
    migrated: entry({ migrated: true, migration: assessment }),
    movedMigration: entry({ migrated: true, disposition: 'relocate' }),
    relocate: entry({ disposition: 'relocate' }),
    review: entry({ disposition: 'review' }),
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
  const rows = buildServiceReport({ services: entries }, audit(Object.keys(entries)));
  assert.deepEqual(
    Object.fromEntries(rows.map(({ name, migrationStatus }) => [name, migrationStatus])),
    {
      dependencies: 'Needs preparation',
      lifecycle: 'Needs preparation',
      migrated: 'Migrated',
      movedMigration: 'Migrated',
      relocate: 'Straightforward',
      review: 'Straightforward',
      straight: 'Straightforward',
    },
  );
  assert.equal(
    rows.find(({ name }) => name === 'movedMigration')?.ownership,
    'Move or split planned',
  );
  assert.equal(rows.find(({ name }) => name === 'review')?.ownership, 'Ownership undecided');
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

test('distinguishes unanalysed entries from zero violations and exposes unlisted roots', () => {
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
  assert.equal(result.find(({ name }) => name === 'unknown')?.ownership, 'Not inventoried');
  assert.equal(result.find(({ name }) => name === 'unknown')?.migrationStatus, 'Not inventoried');
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

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(import.meta.dirname, '../gx-services-'));
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
  const resolver = 'tools/scripts/ci/service-dependency-resolver.mjs';
  await mkdir(dirname(join(root, resolver)), { recursive: true });
  await cp(new URL(`../../../${resolver}`, import.meta.url), join(root, resolver));
  await write('package.json', '{"type":"module"}');
  await symlink(new URL('../node_modules', import.meta.url), join(root, 'node_modules'));
  await write(
    `${services}/service-inventory.yaml`,
    JSON.stringify({ services: { alpha: entry() } }),
  );
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
    'Catalogued entries': 1,
    'Staying in services/': 1,
    Migrated: 0,
    'Unmigrated entries': 1,
    'Unmigrated — staying in services/': 1,
    'Move or split planned': 0,
    'Ownership undecided': 0,
    'Migrated — staying in services/': 0,
    'Needs preparation': 0,
    'Straightforward migrations': 1,
    'Straightforward — dependency violations': 1,
    'Straightforward — no dependency violations': 0,
    'Unmigrated entries with dependency violations': 1,
    'Unmigrated — staying in services/ with dependency violations': 1,
    'Migrated services with dependency violations': 0,
    'Not analyzed': 0,
    'Not inventoried': 0,
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
  const frequencies = f.run(['dependencies', '--json']);
  assert.equal(frequencies.status, 0, frequencies.stderr);
  assert.deepEqual(JSON.parse(frequencies.stdout), [
    { dependency: 'ghost/core/shared/client.js', files: 2 },
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

test('planned moves retain runtime-service notes ahead of older migration assessments', async (t) => {
  const f = await fixture(t);
  const notes =
    '\n  This is a configured runtime service. Split its parser out before moving the service.  \n';
  const planned = entry({ disposition: 'relocate', notes });
  await f.write(
    `${services}/service-inventory.yaml`,
    JSON.stringify({ services: { alpha: planned } }),
  );
  const summary = f.run(['report', '--json']);
  assert.equal(summary.status, 0, summary.stderr);
  const counts = JSON.parse(summary.stdout);
  assert.equal(counts['Unmigrated entries'], 1);
  assert.equal(counts['Move or split planned'], 1);
  assert.equal(counts.Migrated, 0);
  assert.equal(counts['Straightforward migrations'], 0);

  const listing = f.run(['list', '--group', 'relocation', '--json']);
  assert.equal(listing.status, 0, listing.stderr);
  const rows = JSON.parse(listing.stdout);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'alpha');
  assert.equal(rows[0].ownership, 'Move or split planned');
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
    `${services}/service-inventory.yaml`,
    JSON.stringify({ services: { alpha: entry({ notes: ' \n  ' }) } }),
  );
  const blank = f.run(['report', 'alpha']);
  assert.equal(blank.status, 0, blank.stderr);
  assert.doesNotMatch(blank.stdout, /Inventory notes:/);
});

test('list filters match every report group, including unknown analysis and every violation type', async (t) => {
  const f = await fixture(t);
  const entries = {
    absent: entry(),
    alpha: entry(),
    clean: entry(),
    done: entry({ migrated: true }),
    drift: entry({ migrated: true }),
    moved: entry({ migrated: true, disposition: 'relocate' }),
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
  await f.write(`${services}/service-inventory.yaml`, JSON.stringify({ services: entries }));
  for (const name of [...Object.keys(entries), 'unlisted'].filter(
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
    ['catalogued', 'Catalogued entries', Object.keys(entries)],
    [
      'retained',
      'Staying in services/',
      ['absent', 'alpha', 'clean', 'done', 'drift', 'own', 'prepare', 'unresolved'],
    ],
    ['migrated', 'Migrated', ['done', 'drift', 'moved']],
    [
      'unmigrated',
      'Unmigrated entries',
      [
        'absent',
        'alpha',
        'clean',
        'reviewRefactor',
        'own',
        'prepare',
        'relocate',
        'review',
        'unresolved',
      ],
    ],
    [
      'unmigrated-retained',
      'Unmigrated — staying in services/',
      ['absent', 'alpha', 'clean', 'own', 'prepare', 'unresolved'],
    ],
    ['relocation', 'Move or split planned', ['relocate', 'moved']],
    ['ownership-undecided', 'Ownership undecided', ['review', 'reviewRefactor']],
    ['migrated-retained', 'Migrated — staying in services/', ['done', 'drift']],
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
      'unmigrated-with-violations',
      'Unmigrated entries with dependency violations',
      ['alpha', 'own', 'relocate', 'unresolved'],
    ],
    [
      'unmigrated-retained-with-violations',
      'Unmigrated — staying in services/ with dependency violations',
      ['alpha', 'own', 'unresolved'],
    ],
    ['migrated-with-violations', 'Migrated services with dependency violations', ['drift']],
    ['not-analyzed', 'Not analyzed', ['absent']],
    ['not-inventoried', 'Not inventoried', ['unlisted']],
  ];
  const report = f.run(['report']);
  assert.equal(report.status, 0, report.stderr);
  assert.match(report.stdout, /^OWNERSHIP\s+MIGRATED\s+UNMIGRATED\s+TOTAL\s+GROUP/m);
  const summary = f.run(['report', '--json']);
  assert.equal(summary.status, 0, summary.stderr);
  const counts = JSON.parse(summary.stdout);
  assert.equal(Object.keys(counts).length, groups.length);
  assert.equal(
    counts['Catalogued entries'],
    counts['Staying in services/'] +
      counts['Move or split planned'] +
      counts['Ownership undecided'],
  );
  assert.equal(counts['Catalogued entries'], counts.Migrated + counts['Unmigrated entries']);
  assert.equal(
    counts['Staying in services/'],
    counts['Migrated — staying in services/'] + counts['Unmigrated — staying in services/'],
  );
  assert.equal(
    counts['Unmigrated — staying in services/'],
    counts['Needs preparation'] + counts['Straightforward migrations'],
  );
  assert.match(report.stdout, /^Staying in services\/\s+2\s+6\s+8\s+retained$/m);
  assert.match(report.stdout, /^Move or split planned\s+1\s+1\s+2\s+relocation$/m);
  assert.match(report.stdout, /^Ownership undecided\s+0\s+2\s+2\s+ownership-undecided$/m);
  assert.match(report.stdout, /^Total\s+3\s+9\s+12\s+catalogued$/m);
  assert.match(report.stdout, /8 retained = 2 migrated \+ 6 unmigrated\./);
  assert.match(report.stdout, /6 unmigrated = 1 needing preparation \+ 5 straightforward\./);
  const reviewDetails = f.run(['report', 'reviewRefactor']);
  assert.equal(reviewDetails.status, 0, reviewDetails.stderr);
  assert.match(reviewDetails.stdout, /Ownership undecided\s+Needs preparation/);
  for (const [group, label, names] of groups) {
    const result = f.run(['list', '--group', group, '--json']);
    assert.equal(result.status, 0, `${group}: ${result.stderr}`);
    assert.deepEqual(
      JSON.parse(result.stdout),
      rows.filter(({ name }) => names.includes(name)),
      group,
    );
    assert.equal(counts[label], names.length, group);
  }
  const clean = f.run(['list', '--group=straightforward-clear']);
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /^SERVICE\s+OWNERSHIP\s+MIGRATION/m);
  assert.match(clean.stdout, /^clean\s+Staying in services\/\s+Straightforward\s+0\s+0\s+0$/m);
  assert.doesNotMatch(clean.stdout, /^(?:absent|alpha|own|unresolved)\s+/m);
});

test('empty groups preserve list headers and return an empty JSON array', async (t) => {
  const f = await fixture(t);
  const empty = f.run(['list', '--group', 'migrated']);
  assert.equal(empty.status, 0, empty.stderr);
  assert.match(
    empty.stdout,
    /^SERVICE\s+OWNERSHIP\s+MIGRATION\s+DISALLOWED DEPS\s+UNRESOLVED\s+OWN ROOT/m,
  );
  assert.doesNotMatch(empty.stdout, /^alpha\s+/m);
  const json = f.run(['list', '--group', 'migrated', '--json']);
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

test('list help describes groups and invalid filters fail before the audit runs', async (t) => {
  const f = await fixture(t);
  await f.write('.dependency-cruiser.cjs', "throw new Error('Audit must not run');");
  const help = f.run(['list', '--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--group/);
  for (const group of [
    'catalogued',
    'retained',
    'migrated',
    'unmigrated',
    'unmigrated-retained',
    'relocation',
    'ownership-undecided',
    'migrated-retained',
    'needs-preparation',
    'straightforward',
    'straightforward-with-violations',
    'straightforward-clear',
    'unmigrated-with-violations',
    'unmigrated-retained-with-violations',
    'migrated-with-violations',
    'not-analyzed',
    'not-inventoried',
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
    const result = f.run([command, '--group', 'migrated']);
    assert.equal(result.status, 1, command);
    assert.equal(result.stdout, '', command);
    assert.match(result.stderr, /--group/, command);
    assert.doesNotMatch(result.stderr, /Audit must not run/, command);
  }
});
