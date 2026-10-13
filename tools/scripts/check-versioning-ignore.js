import { join } from 'node:path';
import semver from 'semver';

import { ROOT_DIR, PRIVATE_PACKAGE_VERSION } from './lib/constants.js';
import { getWorkspace, getWorkspacePackages } from './lib/pnpm.js';
import { PUBLIC_APPS } from './lib/public-apps.js';
import { readJson } from './lib/utils.js';

// Published packages versioned outside `pnpm version`: Ghost core by the release
// scripts, the public apps by the publish job (npm holds the patch number).
const EXTERNALLY_VERSIONED = new Set(['ghost', ...PUBLIC_APPS.map((app) => app.packageName)]);

/**
 * Reads every workspace manifest, root included.
 *
 * @param {import('./lib/pnpm.js').WorkspaceManifest} workspace
 */
export async function loadManifests(workspace) {
  return [
    await readJson(join(ROOT_DIR, 'package.json')),
    ...(await getWorkspacePackages(workspace)).map((pkg) => pkg.manifest),
  ];
}

/**
 * `pnpm version -r` plans a release for every workspace package carrying a
 * semver version, private or not, unless it is listed in `versioning.ignore`.
 * Private packages opt out by carrying the non-semver placeholder version
 * instead, so the list holds exactly the externally versioned public packages.
 *
 * @param {import('./lib/pnpm.js').WorkspaceManifest} workspace
 * @param {object[]} [manifests] - defaults to the workspace's manifests on disk
 * @returns {Promise<string[]>} - Error messages.
 */
export async function checkVersioningIgnore(workspace, manifests) {
  const ignored = new Set(workspace.versioning?.ignore ?? []);
  const errors = [];

  const sorted = (manifests ?? (await loadManifests(workspace))).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const { name, version, private: isPrivate } of sorted) {
    if (isPrivate) {
      if (version !== PRIVATE_PACKAGE_VERSION) {
        errors.push(
          `${name}: private, so its version must be "${PRIVATE_PACKAGE_VERSION}" (found "${version}")`,
        );
      }
      if (ignored.has(name)) {
        errors.push(`${name}: private, so it needs no versioning.ignore entry`);
      }
    } else if (EXTERNALLY_VERSIONED.has(name)) {
      if (!ignored.has(name)) {
        errors.push(
          `${name}: versioned by its own release scripts, but missing from versioning.ignore`,
        );
      }
    } else {
      if (ignored.has(name)) {
        errors.push(`${name}: published, but listed in versioning.ignore`);
      }
      if (!semver.valid(version)) {
        errors.push(`${name}: published, but its version "${version}" is not semver`);
      }
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
    console.error(`Package versioning config is out of date:\n\n${errors.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Private packages carry version "${PRIVATE_PACKAGE_VERSION}" and versioning.ignore lists exactly the externally versioned packages.`,
    );
  }
}
