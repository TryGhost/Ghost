import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { addPrivatePackageToVersioningIgnore } from '../lib/versioning-ignore.js';

const MANIFEST = `versioning:
  ignore:
    - ghost
    # ignore private packages, which are never published. pnpm bumps them
    # otherwise; \`pnpm lint:versioning\` enforces this list
    - '@tryghost/admin'
    - '@tryghost/shade'
patchedDependencies:
  foo: patches/foo.patch
`;

async function writeManifest() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ghost-versioning-ignore-'));
  const file = path.join(dir, 'pnpm-workspace.yaml');
  await writeFile(file, MANIFEST);
  return file;
}

describe('addPrivatePackageToVersioningIgnore', () => {
  it('inserts the package into the private block in sorted order', async () => {
    const file = await writeManifest();

    assert.strictEqual(await addPrivatePackageToVersioningIgnore('@tryghost/limit', file), true);
    assert.strictEqual(
      await readFile(file, 'utf8'),
      MANIFEST.replace(
        "    - '@tryghost/shade'\n",
        "    - '@tryghost/limit'\n    - '@tryghost/shade'\n",
      ),
    );
  });

  it('leaves the file unchanged when the package is already listed', async () => {
    const file = await writeManifest();

    assert.strictEqual(await addPrivatePackageToVersioningIgnore('@tryghost/admin', file), false);
    assert.strictEqual(await readFile(file, 'utf8'), MANIFEST);
  });

  it('throws when the private block is missing', async () => {
    const file = await writeManifest();
    await writeFile(file, 'versioning:\n  ignore:\n    - ghost\n');

    await assert.rejects(addPrivatePackageToVersioningIgnore('@tryghost/limit', file));
  });
});
