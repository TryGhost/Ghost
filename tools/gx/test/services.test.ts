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

test('classifies ownership before migration difficulty and combines both assessments', () => {
  const entries = {
    migrated: entry({ migrated: true, migration: assessment }),
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
  assert.deepEqual(Object.fromEntries(rows.map(({ name, category }) => [name, category])), {
    dependencies: 'Needs preparation',
    lifecycle: 'Needs preparation',
    migrated: 'Migrated',
    relocate: 'Relocation candidate',
    review: 'Ownership undecided',
    straight: 'Straightforward',
  });
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
  assert.equal(result.find(({ name }) => name === 'unknown')?.category, 'Not inventoried');
});

test('rejects incomplete assessments and invalid audit data instead of reporting a clean result', () => {
  for (const invalid of [
    {},
    { services: { alpha: entry({ disposition: 'unknown' }) } },
    { services: { alpha: entry({ migration: assessment }) } },
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
    'Retained services': 1,
    Migrated: 0,
    'Unmigrated entries': 1,
    'Unmigrated retained services': 1,
    'Relocation candidates': 0,
    'Ownership undecided': 0,
    'Needs preparation': 0,
    'Straightforward migrations': 1,
    'Straightforward — dependency violations': 1,
    'Straightforward — no dependency violations': 0,
    'Unmigrated entries with dependency violations': 1,
    'Unmigrated retained services with dependency violations': 1,
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

test('summary includes own-root-only findings and keeps unanalyzed entries out of the clean category', async (t) => {
  const f = await fixture(t);
  await f.write(
    `${services}/service-inventory.yaml`,
    JSON.stringify({
      services: { alpha: entry(), own: entry(), absent: entry() },
    }),
  );
  await f.write(`${services}/own/index.ts`, 'export const value = 1;');
  await f.write(
    `${services}/own/worker.ts`,
    "import { value } from './index'; console.log(value);",
  );
  const result = f.run(['report', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary['Straightforward migrations'], 3);
  assert.equal(summary['Straightforward — dependency violations'], 2);
  assert.equal(summary['Straightforward — no dependency violations'], 0);
  assert.equal(summary['Not analyzed'], 1);
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
