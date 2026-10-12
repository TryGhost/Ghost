import { join } from 'node:path';

import { ROOT_DIR } from './lib/constants.js';
import { getWorkspace, getWorkspacePackages } from './lib/pnpm.js';
import { PUBLIC_APPS } from './lib/public-apps.js';
import { readJson } from './lib/utils.js';

// Published packages versioned outside `pnpm version`: Ghost core by the release
// scripts, the public apps by release-apps.
const EXTERNALLY_VERSIONED = new Set(['ghost', ...PUBLIC_APPS.map((app) => app.packageName)]);

/**
 * `pnpm version -r` bumps private packages unless they are listed in
 * `versioning.ignore`, so every private package must appear there, and only
 * externally versioned public packages may join them.
 *
 * @param {import('./lib/pnpm.js').WorkspaceManifest} workspace
 * @returns {Promise<string[]>} - Error messages.
 */
export async function checkVersioningIgnore(workspace) {
  const ignored = new Set(workspace.versioning?.ignore ?? []);
  const manifests = [
    await readJson(join(ROOT_DIR, 'package.json')),
    ...(await getWorkspacePackages(workspace)).map((pkg) => pkg.manifest),
  ];
  const errors = [];

  for (const { name, private: isPrivate } of manifests.sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (isPrivate && !ignored.has(name)) {
      errors.push(`${name}: private, but missing from versioning.ignore`);
    } else if (EXTERNALLY_VERSIONED.has(name) && !ignored.has(name)) {
      errors.push(
        `${name}: versioned by its own release scripts, but missing from versioning.ignore`,
      );
    } else if (!isPrivate && ignored.has(name) && !EXTERNALLY_VERSIONED.has(name)) {
      errors.push(`${name}: published, but listed in versioning.ignore`);
    }
    ignored.delete(name);
  }

  for (const name of ignored) {
    errors.push(`${name}: listed in versioning.ignore, but not a workspace package`);
  }

  return errors;
}

if (import.meta.main) {
  const errors = await checkVersioningIgnore(await getWorkspace());
  if (errors.length > 0) {
    console.error(
      `versioning.ignore in pnpm-workspace.yaml is out of date:\n\n${errors.join('\n')}`,
    );
    process.exitCode = 1;
  } else {
    console.log('versioning.ignore lists exactly the unversioned packages.');
  }
}
