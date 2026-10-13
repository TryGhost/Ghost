import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  checkVersioningIgnore,
  loadManifests,
  type NamedManifest,
} from '../check-versioning-ignore.ts';
import { getWorkspace as loadWorkspace, type WorkspaceManifest } from '../lib/pnpm.ts';

async function getWorkspace(): Promise<WorkspaceManifest> {
  const workspace = await loadWorkspace();
  assert.ok(workspace, 'pnpm-workspace.yaml should load');
  return workspace;
}

async function workspaceWithIgnore(update: (ignore: string[]) => string[]) {
  const workspace = await getWorkspace();
  return {
    ...workspace,
    versioning: { ...workspace.versioning, ignore: update(workspace.versioning?.ignore ?? []) },
  };
}

async function manifestsWith(name: string, update: Partial<Omit<NamedManifest, 'name'>>) {
  const manifests = await loadManifests(await getWorkspace());
  return manifests.map((manifest) =>
    manifest.name === name ? { ...manifest, ...update } : manifest,
  );
}

describe('checkVersioningIgnore (against the live workspace)', () => {
  it('passes for the committed workspace', async () => {
    assert.deepStrictEqual(await checkVersioningIgnore(await getWorkspace()), []);
  });

  it('flags a private package carrying a semver version', async () => {
    const workspace = await getWorkspace();
    const manifests = await manifestsWith('@tryghost/shade', { version: '0.0.0' });

    assert.deepStrictEqual(await checkVersioningIgnore(workspace, manifests), [
      '@tryghost/shade: private, so its version must be "private" (found "0.0.0")',
    ]);
  });

  it('flags a private package listed in the ignore list', async () => {
    const workspace = await workspaceWithIgnore((ignore) => [...ignore, '@tryghost/shade']);

    assert.deepStrictEqual(await checkVersioningIgnore(workspace), [
      '@tryghost/shade: private, so it needs no versioning.ignore entry',
    ]);
  });

  it('flags an externally versioned package missing from the list', async () => {
    const workspace = await workspaceWithIgnore((ignore) =>
      ignore.filter((name) => name !== '@tryghost/portal'),
    );

    assert.deepStrictEqual(await checkVersioningIgnore(workspace), [
      '@tryghost/portal: versioned by its own release scripts, but missing from versioning.ignore',
    ]);
  });

  it('flags published and unknown packages in the list', async () => {
    const workspace = await workspaceWithIgnore((ignore) => [
      ...ignore,
      '@tryghost/koenig-lexical',
      '@tryghost/does-not-exist',
    ]);

    assert.deepStrictEqual(await checkVersioningIgnore(workspace), [
      '@tryghost/koenig-lexical: published, but listed in versioning.ignore',
      '@tryghost/does-not-exist: listed in versioning.ignore, but not a workspace package',
    ]);
  });

  it('flags a published package without a semver version', async () => {
    const workspace = await getWorkspace();
    const manifests = await manifestsWith('@tryghost/kg-utils', { version: 'private' });

    assert.deepStrictEqual(await checkVersioningIgnore(workspace, manifests), [
      '@tryghost/kg-utils: published, but its version "private" is not semver',
    ]);
  });
});
