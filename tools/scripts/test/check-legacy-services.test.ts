import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it, type TestContext } from 'node:test';
import { compareLegacyServicesWithBase } from '../ci/legacy-services-base.ts';
import { legacyInventoryFile, servicesRoot } from '../../configs/oxlint/legacy-services.ts';

const repository = path.resolve(import.meta.dirname, '../../..');
const previousInventoryFile = `${servicesRoot}/service-inventory.yaml`;
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
};
const inventory = (services: Record<string, object>) => JSON.stringify({ services });

// A throwaway repository: main holds `base`, and the checkout is a branch
// forked from it, with origin/main pointing at main as it does after a fetch.
function fixture(t: TestContext, base: string, file = legacyInventoryFile) {
  const root = mkdtempSync(path.join(tmpdir(), 'ghost-legacy-services-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', env: GIT_ENV }).trim();
  const write = (source: string, target = legacyInventoryFile) => {
    mkdirSync(path.dirname(path.join(root, target)), { recursive: true });
    writeFileSync(path.join(root, target), source);
  };
  const commit = (message: string) => {
    git('add', '--all');
    // A developer's signing setup can fail when many fixtures commit at once.
    git('commit', '--quiet', '--allow-empty', '--no-gpg-sign', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  git('init', '--quiet', '--initial-branch', 'main', '.');
  write(base, file);
  const forkPoint = commit('base');
  git('update-ref', 'refs/remotes/origin/main', forkPoint);
  git('checkout', '--quiet', '-b', 'feature');
  return {
    root,
    git,
    write,
    commit,
    forkPoint,
    compare: (env: NodeJS.ProcessEnv = {}) => compareLegacyServicesWithBase(root, env),
  };
}

it('accepts an unchanged or smaller list of legacy services', (t) => {
  const f = fixture(t, inventory({ alpha: {}, beta: {} }));
  assert.deepEqual(f.compare(), {
    mergeBase: f.forkPoint,
    listed: 2,
    added: [],
    newlyDeferred: [],
  });
  f.write(inventory({ alpha: {} }));
  f.commit('migrate beta');
  assert.deepEqual(f.compare().added, []);
  assert.equal(f.compare().listed, 1);
});

it('rejects added and renamed legacy services, committed or not', (t) => {
  const f = fixture(t, inventory({ alpha: {}, beta: {} }));
  // The working tree is what lint reads, so an uncommitted entry counts.
  f.write(inventory({ alpha: {}, beta: {}, gamma: {} }));
  assert.deepEqual(f.compare().added, ['gamma']);
  f.commit('add gamma');
  assert.deepEqual(f.compare().added, ['gamma']);
  // A rename is a new name, however many entries there are.
  f.write(inventory({ alpha: {}, 'beta-renamed': {} }));
  assert.deepEqual(f.compare().added, ['beta-renamed']);
  // Flow style or block style, it is the same list.
  f.write('services:\n  alpha: {}\n  delta:\n    kind: directory\n');
  assert.deepEqual(f.compare().added, ['delta']);
});

it('compares with the fork point, not with the tip of the base branch', (t) => {
  const f = fixture(t, inventory({ alpha: {}, beta: {} }));
  f.commit('branch work');
  // Meanwhile beta is migrated on main. This branch did not add it.
  f.git('checkout', '--quiet', 'main');
  f.write(inventory({ alpha: {} }));
  const mainTip = f.commit('migrate beta on main');
  f.git('update-ref', 'refs/remotes/origin/main', mainTip);
  f.git('checkout', '--quiet', 'feature');
  const result = f.compare();
  assert.equal(result.mergeBase, f.forkPoint);
  assert.deepEqual(result.added, []);
  // After merging main, the fork point moves and the stale entry must go.
  f.git('merge', '--quiet', '--no-edit', '--no-gpg-sign', '-X', 'ours', 'main');
  f.write(inventory({ alpha: {}, beta: {} }));
  assert.deepEqual(f.compare().added, ['beta']);
});

it('reads the previous inventory at the fork point, where legacy meant not migrated', (t) => {
  const f = fixture(
    t,
    inventory({ alpha: {}, beta: { migrated: false }, done: { migrated: true } }),
    previousInventoryFile,
  );
  f.git('mv', previousInventoryFile, legacyInventoryFile);
  f.write(inventory({ alpha: {}, beta: { dependencyChecks: 'deferred' } }));
  f.commit('split the inventory');
  // Deferrals were not recorded in that file, so they cannot be compared.
  assert.deepEqual(f.compare(), {
    mergeBase: f.forkPoint,
    listed: 2,
    added: [],
    newlyDeferred: [],
  });
  f.write(inventory({ alpha: {}, beta: {}, done: {} }));
  assert.deepEqual(f.compare().added, ['done']);
  f.write(inventory({ alpha: {}, beta: {}, gamma: {} }));
  assert.deepEqual(f.compare().added, ['gamma']);
});

it('rejects a legacy service that starts deferring dependency checks', (t) => {
  const f = fixture(t, inventory({ alpha: {}, busy: { dependencyChecks: 'deferred' } }));
  assert.deepEqual(f.compare().newlyDeferred, []);
  f.write(inventory({ alpha: { dependencyChecks: 'deferred' }, busy: {} }));
  const result = f.compare();
  assert.deepEqual(result.added, []);
  assert.deepEqual(result.newlyDeferred, ['alpha']);
});

it('uses the pull request base branch, and its payload SHA when the branch was not fetched', (t) => {
  const f = fixture(t, inventory({ alpha: {} }));
  f.write(inventory({ alpha: {}, beta: {} }));
  const stacked = f.commit('parent branch adds beta');
  f.git('update-ref', 'refs/remotes/origin/parent', stacked);
  f.git('checkout', '--quiet', '-b', 'child');
  assert.deepEqual(f.compare().added, ['beta']);
  assert.deepEqual(f.compare({ PR_BASE_REF: 'parent' }).added, []);
  assert.deepEqual(f.compare({ PR_BASE_REF: 'not-fetched', PR_BASE_SHA: stacked }).added, []);
  assert.equal(f.compare({ PR_BASE_REF: 'parent' }).mergeBase, stacked);
});

it('fails instead of passing when there is nothing to compare with', (t) => {
  const f = fixture(t, inventory({ alpha: {} }));
  assert.throws(() => f.compare({ PR_BASE_REF: 'not-fetched' }), /Cannot find origin\/not-fetched/);
  assert.throws(
    () => f.compare({ PR_BASE_REF: 'not-fetched', PR_BASE_SHA: '0'.repeat(40) }),
    /Cannot find origin\/not-fetched/,
  );
  f.git('update-ref', '-d', 'refs/remotes/origin/main');
  assert.throws(() => f.compare(), /Cannot find origin\/main.*git fetch origin main/);

  // No shared history with the base.
  f.git('checkout', '--quiet', '--orphan', 'disjoint');
  f.commit('unrelated');
  f.git('update-ref', 'refs/remotes/origin/main', f.forkPoint);
  assert.throws(() => f.compare(), /Cannot find where this branch forked/);

  // A base from before either inventory existed.
  const empty = fixture(t, 'not an inventory', 'README.md');
  empty.write(inventory({ alpha: {} }));
  assert.throws(() => empty.compare(), /Neither .*legacy-service-inventory\.yaml nor/);

  // An unreadable list is an error, not an empty list.
  const broken = fixture(t, inventory({ alpha: {} }));
  broken.write('[]');
  assert.throws(() => broken.compare(), /expected a services mapping/);
});

it('reports each addition through the command and exits non-zero', (t) => {
  const f = fixture(t, inventory({ alpha: {}, busy: {} }));
  for (const file of [
    'tools/scripts/ci/check-legacy-services.ts',
    'tools/scripts/ci/legacy-services-base.ts',
    'tools/configs/oxlint/legacy-services.ts',
  ]) {
    mkdirSync(path.dirname(path.join(f.root, file)), { recursive: true });
    cpSync(path.join(repository, file), path.join(f.root, file));
  }
  // Each workspace reads YAML with its own parser.
  for (const workspace of ['tools/scripts', 'tools/configs/oxlint']) {
    writeFileSync(path.join(f.root, workspace, 'package.json'), '{"type":"module"}');
    symlinkSync(
      path.join(repository, workspace, 'node_modules'),
      path.join(f.root, workspace, 'node_modules'),
    );
  }
  const run = (env: NodeJS.ProcessEnv = {}) =>
    spawnSync(process.execPath, ['tools/scripts/ci/check-legacy-services.ts'], {
      cwd: f.root,
      encoding: 'utf8',
      env: { ...process.env, PR_BASE_REF: undefined, PR_BASE_SHA: undefined, ...env },
    });
  const clean = run();
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /No legacy services added \(2 listed/);

  f.write(inventory({ alpha: {}, busy: { dependencyChecks: 'deferred' }, gamma: {} }));
  const grown = run();
  assert.equal(grown.status, 1, grown.stdout);
  assert.equal(grown.stdout, '');
  assert.match(grown.stderr, /error gamma was added to services/);
  assert.match(grown.stderr, /error busy now defers dependency checks/);

  const noBase = run({ PR_BASE_REF: 'not-fetched' });
  assert.equal(noBase.status, 1, noBase.stdout);
  assert.equal(noBase.stdout, '');
  assert.match(noBase.stderr, /Cannot find origin\/not-fetched/);
});
