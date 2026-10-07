import { describe, it } from 'node:test';
import assert from 'node:assert';

import { checkVersioningIgnore } from '../check-versioning-ignore.js';
import { getWorkspace } from '../lib/pnpm.js';

async function workspaceWithIgnore(update) {
  const workspace = await getWorkspace();
  return {
    ...workspace,
    versioning: { ...workspace.versioning, ignore: update(workspace.versioning.ignore) },
  };
}

describe('checkVersioningIgnore (against the live workspace)', () => {
  it('passes for the committed pnpm-workspace.yaml', async () => {
    assert.deepStrictEqual(await checkVersioningIgnore(await getWorkspace()), []);
  });

  it('flags a private package missing from the list', async () => {
    const workspace = await workspaceWithIgnore((ignore) =>
      ignore.filter((name) => name !== '@tryghost/shade'),
    );

    assert.deepStrictEqual(await checkVersioningIgnore(workspace), [
      '@tryghost/shade: private, but missing from versioning.ignore',
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
});
