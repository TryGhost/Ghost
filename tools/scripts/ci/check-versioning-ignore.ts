import { join } from 'node:path';
import semver from 'semver';

import { ROOT_DIR, PRIVATE_PACKAGE_VERSION } from '../lib/constants.ts';
import {
  getWorkspace,
  getWorkspacePackages,
  type PackageManifest,
  type WorkspaceManifest,
} from '../lib/pnpm.ts';
import { CONTINUOUS_PACKAGES } from '../lib/publish-manifest.ts';
import { readJson } from '../lib/utils.ts';

// Published packages versioned outside `pnpm version`: Ghost core by the release
// scripts, the continuous lane by its publish job (npm holds the moving part).
const EXTERNALLY_VERSIONED = new Set(['ghost', ...CONTINUOUS_PACKAGES.map((pkg) => pkg.name)]);

// Every manifest in this workspace is named.
export type NamedManifest = PackageManifest & { name: string };

/** Reads every workspace manifest, root included. */
export async function loadManifests(workspace: WorkspaceManifest): Promise<NamedManifest[]> {
  return [
    await readJson<PackageManifest>(join(ROOT_DIR, 'package.json')),
    ...(await getWorkspacePackages(workspace)).map((pkg) => pkg.manifest),
  ] as NamedManifest[];
}

/**
 * `pnpm version -r` plans a release for every workspace package carrying a
 * semver version, private or not, unless it is listed in `versioning.ignore`.
 * Private packages opt out by carrying the non-semver placeholder version
 * instead, so the list holds exactly the externally versioned public packages.
 *
 * `manifests` defaults to the workspace's manifests on disk. Returns error
 * messages.
 */
export async function checkVersioningIgnore(
  workspace: WorkspaceManifest,
  manifests?: NamedManifest[],
): Promise<string[]> {
  const ignored = new Set(workspace.versioning?.ignore ?? []);
  const errors: string[] = [];

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
  const workspace = await getWorkspace();
  if (!workspace) {
    throw new Error('Could not load workspace manifest');
  }
  const errors = await checkVersioningIgnore(workspace);
  if (errors.length > 0) {
    console.error(`Package versioning config is out of date:\n\n${errors.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Private packages carry version "${PRIVATE_PACKAGE_VERSION}" and versioning.ignore lists exactly the externally versioned packages.`,
    );
  }
}
