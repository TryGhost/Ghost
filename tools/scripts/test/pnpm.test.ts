import { after, before, describe, it } from 'node:test';
import { join } from 'node:path';
import assert from 'node:assert';

import { findPackagesNeedingChangeset, getPublishablePackages, getWorkspace } from '../lib/pnpm.ts';
import { INTERNAL_DOCS_PATTERN } from '../lib/constants.ts';
import { WorkspaceFixture } from './workspace-fixture.ts';

describe('getPublishablePackages (against the live workspace)', () => {
  it('returns publishable packages with the documented shape', async () => {
    const wksp = await getWorkspace();
    assert.ok(wksp);
    const pkgs = await getPublishablePackages(wksp);

    assert.ok(pkgs.length > 0, 'expected at least one publishable package');

    for (const pkg of pkgs) {
      assert.strictEqual(typeof pkg.name, 'string');
      assert.strictEqual(typeof pkg.pkgPath, 'string');
      assert.ok(pkg.pkgPath.endsWith('package.json'));
      assert.strictEqual(typeof pkg.dir, 'string');
      assert.strictEqual(pkg.manifest.name, pkg.name);
    }
  });

  it('excludes private and ignored packages', async () => {
    const wksp = await getWorkspace();
    assert.ok(wksp);
    const pkgs = await getPublishablePackages(wksp);
    const names = new Set(pkgs.map((p) => p.name));

    // none of the returned manifests may be marked private
    assert.ok(pkgs.every((p) => !p.manifest.private));

    // everything in versioning.ignore must be filtered out
    for (const ignored of wksp.versioning?.ignore ?? []) {
      assert.ok(!names.has(ignored), `${ignored} is in versioning.ignore but was returned`);
    }
  });
});

describe('findPackagesNeedingChangeset (fixture repo)', () => {
  const pkg = (name: string, extra: object = {}) => ({ name, version: '1.0.0', ...extra });
  const workspaceYaml = (dep: string, legacyDep: string) =>
    [
      'packages:',
      '  - packages/*',
      'catalog:',
      `  dep: ${dep}`,
      'catalogs:',
      '  legacy:',
      `    legacy-dep: ${legacyDep}`,
      'versioning:',
      '  ignore:',
      '    - ignored',
      '',
    ].join('\n');

  let fixture: WorkspaceFixture;
  let base: string;

  const check = (head: string, ignorePatterns = [INTERNAL_DOCS_PATTERN]) =>
    findPackagesNeedingChangeset(base, head, ignorePatterns, { rootDir: fixture.dir });

  before(() => {
    fixture = new WorkspaceFixture({
      'pnpm-workspace.yaml': workspaceYaml('1.0.0', '1.0.0'),
      'packages/plain/package.json': pkg('plain'),
      'packages/plain/index.js': '',
      'packages/catalog/package.json': pkg('catalog', { dependencies: { dep: 'catalog:' } }),
      'packages/legacy/package.json': pkg('legacy', {
        dependencies: { 'legacy-dep': 'catalog:legacy' },
      }),
      'packages/private/package.json': pkg('private', {
        private: true,
        dependencies: { dep: 'catalog:' },
      }),
      'packages/ignored/package.json': pkg('ignored', { dependencies: { dep: 'catalog:' } }),
    });
    base = fixture.commit('base');
  });

  after(() => fixture.cleanup());

  it('reports a changed package without a change intent', async () => {
    const head = fixture.commitOn(base, { 'packages/plain/index.js': 'changed' });
    assert.deepStrictEqual(await check(head), ['plain']);
  });

  it('does not report a changed package covered by a new change intent', async () => {
    const head = fixture.commitOn(base, {
      'packages/plain/index.js': 'changed',
      '.changeset/plain-change.md': '---\n"plain": patch\n---\n\nChanged plain\n',
    });
    assert.deepStrictEqual(await check(head), []);
  });

  it('reports the publishable consumers of a bumped default catalog entry', async () => {
    const head = fixture.commitOn(base, { 'pnpm-workspace.yaml': workspaceYaml('1.0.1', '1.0.0') });
    assert.deepStrictEqual(await check(head), ['catalog']);
  });

  it('reports the consumers of a bumped named catalog entry', async () => {
    const head = fixture.commitOn(base, { 'pnpm-workspace.yaml': workspaceYaml('1.0.0', '1.0.1') });
    assert.deepStrictEqual(await check(head), ['legacy']);
  });

  it('reports a package that is new at head', async () => {
    const head = fixture.commitOn(base, { 'packages/added/package.json': pkg('added') });
    assert.deepStrictEqual(await check(head), ['added']);
  });

  it('never reports the root, private or versioning-ignored packages', async () => {
    const head = fixture.commitOn(base, {
      'root-file.js': 'changed',
      'packages/private/index.js': 'changed',
      'packages/ignored/index.js': 'changed',
    });
    assert.deepStrictEqual(await check(head), []);
  });

  it('ignores internal docs but not the published README', async () => {
    const docsOnly = fixture.commitOn(base, {
      'packages/plain/AGENTS.md': 'docs',
      'packages/plain/docs/guide.md': 'docs',
    });
    assert.deepStrictEqual(await check(docsOnly), []);
    assert.deepStrictEqual(await check(docsOnly, []), ['plain']);

    const readme = fixture.commitOn(base, { 'packages/plain/README.md': 'docs' });
    assert.deepStrictEqual(await check(readme), ['plain']);
  });

  it('accepts a tree as head, as the pre-commit hook passes', async () => {
    const head = fixture.commitOn(base, { 'packages/plain/index.js': 'changed' });
    const tree = fixture.git(['rev-parse', `${head}^{tree}`]);
    assert.deepStrictEqual(await check(tree), ['plain']);
  });

  it('compares against the working tree when head is empty', async () => {
    fixture.git(['checkout', '--quiet', '--detach', base]);
    assert.deepStrictEqual(await check(''), []);

    fixture.write({ 'packages/plain/index.js': 'uncommitted' });
    try {
      assert.deepStrictEqual(await check(''), ['plain']);
    } finally {
      fixture.git(['checkout', '--quiet', '--', '.']);
    }
  });

  it('removes the worktree it checks head out into', async () => {
    const head = fixture.commitOn(base, { 'packages/plain/index.js': 'changed' });
    await check(head);
    assert.strictEqual(
      fixture.git(['worktree', 'list', '--porcelain']).match(/^worktree /gm)?.length,
      1,
    );
  });

  it("leaves the caller's index alone when run from a git hook", async () => {
    const head = fixture.commitOn(base, { 'packages/plain/index.js': 'changed' });
    const tree = fixture.git(['rev-parse', `${head}^{tree}`]);
    const index = fixture.git(['ls-files', '--stage', '-v']);

    // git runs hooks with GIT_INDEX_FILE pointing at the index being committed.
    process.env.GIT_INDEX_FILE = join(fixture.dir, '.git', 'index');
    try {
      assert.deepStrictEqual(await check(tree), ['plain']);
    } finally {
      delete process.env.GIT_INDEX_FILE;
    }

    assert.strictEqual(fixture.git(['ls-files', '--stage', '-v']), index);
  });
});
