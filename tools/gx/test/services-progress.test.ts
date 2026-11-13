import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { classifyProgress, formatProgress } from '../services-progress.ts';
import {
  legacyInventoryFile,
  servicesRoot as services,
} from '../../configs/oxlint/legacy-services.ts';

const entry = (from: string, to: string, rule = 'service-dependencies') => ({
  rule,
  from: `${services}/${from}`,
  to,
});
const module = (from: string, dependencies: Array<[string, string, string[]?]>) => ({
  source: `${services}/${from}`,
  dependencies: dependencies.map(([specifier, resolved, dependencyTypes]) => ({
    module: specifier,
    resolved,
    dependencyTypes: dependencyTypes ?? ['local'],
  })),
});

test('puts every removed known violation in one bucket and pairs moves and rule changes', () => {
  const before = [
    entry('alpha/fixed.ts', 'ghost/core/shared/config.ts'),
    entry('alpha/types.ts', 'ghost/core/shared/config.ts'),
    entry('alpha/allowed.ts', 'lodash/pick'),
    entry('alpha/allowed-file.ts', 'ghost/core/server/lib/helper.ts'),
    entry('alpha/old-name.ts', 'ghost/core/shared/config.ts'),
    entry('alpha/split.ts', 'ghost/core/shared/config.ts'),
    entry('alpha/target.ts', 'ghost/core/server/lib/old-target.js'),
    entry('alpha/gone.ts', 'ghost/core/shared/config.ts'),
    entry('alpha/reclassified.ts', 'stripe'),
    entry('alpha/kept.ts', 'ghost/core/shared/config.ts'),
    entry('alpha/untracked.ts', 'ghost/core/shared/config.ts'),
  ];
  const after = [
    entry('alpha/kept.ts', 'ghost/core/shared/config.ts'),
    entry('alpha/new-name.ts', 'ghost/core/shared/config.ts'),
    entry('beta/split.ts', 'ghost/core/shared/config.ts'),
    entry('alpha/target.ts', 'ghost/core/server/lib/new-target.ts'),
    entry('alpha/reclassified.ts', 'stripe', 'specialist-dependencies'),
    entry('alpha/added.ts', 'ghost/core/shared/config.ts'),
  ];
  const renames = new Map([
    [`${services}/alpha/old-name.ts`, `${services}/alpha/new-name.ts`],
    [`${services}/alpha/split.ts`, `${services}/beta/split.ts`],
    ['ghost/core/server/lib/old-target.js', 'ghost/core/server/lib/new-target.ts'],
  ]);
  const graph = {
    modules: [
      module('alpha/fixed.ts', []),
      module('alpha/types.ts', [
        ['../../../shared/config', 'ghost/core/shared/config.ts', ['type-only']],
      ]),
      module('alpha/allowed.ts', [['lodash/pick', 'node_modules/lodash/pick.js', ['npm']]]),
      module('alpha/allowed-file.ts', [
        ['../../lib/helper', 'ghost/core/server/lib/helper.ts', ['local']],
      ]),
      module('alpha/untracked.ts', [
        ['../../../shared/config', 'ghost/core/shared/config.ts', ['local']],
      ]),
    ],
    summary: {
      violations: [{ from: `${services}/alpha/untracked.ts`, to: 'ghost/core/shared/config.ts' }],
    },
  };
  const progress = classifyProgress({
    since: 'base',
    before,
    after,
    graph,
    renames,
    deferred: 4,
  });
  const froms = (entries: Array<{ from: string }>) =>
    entries.map(({ from }) => from.slice(services.length + 1)).sort();
  assert.deepEqual(froms(progress.fixed), ['alpha/fixed.ts', 'alpha/types.ts']);
  assert.deepEqual(froms(progress.allowed), ['alpha/allowed-file.ts', 'alpha/allowed.ts']);
  assert.deepEqual(froms(progress.deleted), ['alpha/gone.ts']);
  assert.deepEqual(
    progress.moved.map(({ before: from, after: to, services: names }) => [
      from.from.slice(services.length + 1),
      to.from.slice(services.length + 1),
      to.to,
      names,
    ]),
    [
      ['alpha/old-name.ts', 'alpha/new-name.ts', 'ghost/core/shared/config.ts', ['alpha', 'alpha']],
      ['alpha/split.ts', 'beta/split.ts', 'ghost/core/shared/config.ts', ['alpha', 'beta']],
      [
        'alpha/target.ts',
        'alpha/target.ts',
        'ghost/core/server/lib/new-target.ts',
        ['alpha', 'alpha'],
      ],
    ],
  );
  assert.deepEqual(
    progress.ruleChanged.map(({ before: from, after: to }) => [from.rule, to.rule]),
    [['service-dependencies', 'specialist-dependencies']],
  );
  assert.deepEqual(froms(progress.stillRejected), ['alpha/untracked.ts']);
  assert.deepEqual(froms(progress.added), ['alpha/added.ts']);
  assert.equal(progress.before, before.length);
  assert.equal(progress.after, after.length);

  // Every removed entry is counted once.
  const removed = before.length - 1;
  assert.equal(
    progress.fixed.length +
      progress.allowed.length +
      progress.deleted.length +
      progress.moved.length +
      progress.ruleChanged.length +
      progress.stillRejected.length,
    removed,
  );

  const text = formatProgress(progress);
  assert.match(text, /^Known violations since base: 11 → 6$/m);
  assert.match(text, /^Fixed\s+2$/m);
  assert.match(text, /^Allowed by a rule change\s+2$/m);
  assert.match(text, /^Moved or split\s+3$/m);
  assert.match(text, /^File deleted\s+1$/m);
  assert.match(text, /^Recorded under another rule\s+1$/m);
  assert.match(text, /^Still rejected, not recorded\s+1$/m);
  assert.match(text, /^Added\s+1$/m);
  assert.ok(text.includes(`- ${services}/alpha/untracked.ts → ghost/core/shared/config.ts`));
  assert.ok(
    text.includes(`- alpha → beta: ${services}/alpha/split.ts → ${services}/beta/split.ts`),
  );
  assert.ok(text.includes(`- ${services}/alpha/added.ts → ghost/core/shared/config.ts`));
  assert.match(text, /deferred checks have 4 current violations/);
});

async function repository(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'ghost-gx-progress-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const write = async (file: string, source: string) => {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), source);
  };
  for (const file of ['cli.ts', 'services.ts', 'services-progress.ts', 'run-ghost-command.ts']) {
    await mkdir(join(root, 'tools/gx'), { recursive: true });
    await cp(new URL(`../${file}`, import.meta.url), join(root, 'tools/gx', file));
  }
  for (const file of [
    '.dependency-cruiser.cjs',
    'tools/scripts/ci/service-dependency-resolver.mjs',
    'tools/scripts/lib/dependency-boundaries.ts',
    'tools/configs/oxlint/legacy-services.ts',
  ]) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await cp(new URL(`../../../${file}`, import.meta.url), join(root, file));
  }
  await symlink(new URL('../node_modules', import.meta.url), join(root, 'node_modules'));
  await write('package.json', '{"type":"module"}');
  await write('apps/empty.ts', 'export {};');
  await write(
    legacyInventoryFile,
    JSON.stringify({ services: { alpha: { kind: 'directory', disposition: 'migrate' } } }),
  );
  await write('ghost/core/shared/client.js', 'export const client = {};');
  const git = (...args: string[]) => {
    const result = spawnSync(
      'git',
      ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  return { root, write, git };
}

test('CLI compares the known violations at a commit with the checkout', async (t) => {
  const { root, write, git } = await repository(t);
  const known = (files: string[]) =>
    write(
      '.dependency-cruiser-known-violations.json',
      JSON.stringify(
        files.map((file) => ({
          rule: 'service-dependencies',
          from: `${services}/alpha/${file}`,
          to: 'ghost/core/shared/client.js',
        })),
      ),
    );
  await write(`${services}/alpha/index.ts`, 'export {};');
  await write(`${services}/alpha/fixed.ts`, "import '../../../shared/client.js';");
  await write(`${services}/alpha/renamed.ts`, "import '../../../shared/client.js';");
  await known(['fixed.ts', 'renamed.ts']);
  git('init', '-q', '-b', 'main');
  git('add', '-A');
  git('commit', '-q', '--no-gpg-sign', '-m', 'Base');
  const base = git('rev-parse', 'HEAD');

  await write(`${services}/alpha/fixed.ts`, 'export {};');
  git('mv', `${services}/alpha/renamed.ts`, `${services}/alpha/moved.ts`);
  await write(`${services}/alpha/added.ts`, "import '../../../shared/client.js';");
  await known(['moved.ts', 'added.ts']);

  const result = spawnSync(
    process.execPath,
    [join(root, 'tools/gx/cli.ts'), 'services', 'progress', '--since', base, '--json'],
    { cwd: tmpdir(), encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const progress = JSON.parse(result.stdout);
  assert.equal(progress.since, base);
  assert.deepEqual(
    progress.fixed.map(({ from }: { from: string }) => from),
    [`${services}/alpha/fixed.ts`],
  );
  assert.deepEqual(
    progress.moved.map(({ after }: { after: { from: string } }) => after.from),
    [`${services}/alpha/moved.ts`],
  );
  assert.deepEqual(
    progress.added.map(({ from }: { from: string }) => from),
    [`${services}/alpha/added.ts`],
  );
  assert.deepEqual(
    [progress.allowed, progress.deleted, progress.ruleChanged, progress.stillRejected],
    [[], [], [], []],
  );

  const missing = spawnSync(
    process.execPath,
    [join(root, 'tools/gx/cli.ts'), 'services', 'progress', '--since', 'no-such-ref'],
    { cwd: tmpdir(), encoding: 'utf8' },
  );
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, '');
  assert.match(missing.stderr, /no-such-ref/);
});
