import { glob } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { load } from 'js-yaml';
import {
  readWorkspaceManifest,
  validateWorkspaceManifest,
  type WorkspaceManifest,
} from '@pnpm/workspace.workspace-manifest-reader';
import { readChangeIntents, CHANGES_DIR } from '@pnpm/releasing.versioning';

import { ROOT_DIR } from './constants.ts';
import { getFileFromCommit, getChangedFiles, pathHasChanges } from './git.ts';
import { readJson } from './utils.ts';

const WORKSPACE_MANIFEST_FILE = 'pnpm-workspace.yaml';

export type { WorkspaceManifest };

/** The workspace fields catalog resolution reads. */
export type WorkspaceCatalogs = Pick<WorkspaceManifest, 'catalog' | 'catalogs'>;

type DependencyMap = Record<string, string>;

/** The parts of a package.json these scripts read; the rest passes through. */
export interface PackageManifest {
  name?: string;
  version?: string;
  private?: boolean;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
  [key: string]: unknown;
}

export interface WorkspacePackage {
  name: string;
  /** The path to the package.json file, relative to the repo root. */
  pkgPath: string;
  manifest: PackageManifest & { name: string };
  /** The package directory, relative to the repo root. */
  dir: string;
}

export const getWorkspace = () => readWorkspaceManifest(ROOT_DIR);

/**
 * Loads workspace manifest contents at a specific commit hash. An empty
 * manifest validates and yields undefined.
 */
export async function loadWorkspace(commitHash: string): Promise<WorkspaceManifest | undefined> {
  const fileContent = await getFileFromCommit(commitHash, WORKSPACE_MANIFEST_FILE);
  if (!fileContent) {
    throw new Error(`Could not find ${WORKSPACE_MANIFEST_FILE} in commit ${commitHash}`);
  }

  const workspace = load(fileContent);
  validateWorkspaceManifest(workspace);
  return workspace;
}

export async function loadPackage(
  commitHash: string,
  packagePath: string,
): Promise<PackageManifest | null> {
  // allowMissing: a package absent from the base commit is a new package, not
  // an error. getFileFromCommit returns null and we treat it as such, so the
  // caller follows the changeset-required path. Invalid commits still throw.
  const fileContent = await getFileFromCommit(commitHash, packagePath, { allowMissing: true });
  if (!fileContent) {
    // file does not exist in this commit, return null to indicate that
    // this is a new package
    return null;
  }

  return JSON.parse(fileContent);
}

const packageSections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;
const catalogRegex = /^catalog:([\w.-]+)?$/;

/**
 * Resovles a version from the workspace catalog. Throws if not found in the catalog
 *
 * @returns The resolved version from the catalog, null if not a catalog dep
 */
function resolveCatalogVersion(
  workspace: WorkspaceCatalogs,
  depName: string,
  depVersion: string,
): string | null {
  const match = catalogRegex.exec(depVersion);
  if (!match) {
    return null;
  }

  const catalogName = match[1];
  const version = catalogName
    ? workspace.catalogs?.[catalogName]?.[depName]
    : workspace.catalog?.[depName];

  if (!version) {
    throw new Error(
      `Could not resolve catalog dependency ${depName} from catalog ${catalogName || 'default'}`,
    );
  }

  return version;
}

/**
 * resolves the package dependencies from the pnpm-workspace.yaml file for a given
 * commit and package path.
 *
 * @returns The package.json object with resolved dependencies.
 */
export function resolvePackageCatalog(
  workspace: WorkspaceCatalogs,
  pkg: PackageManifest,
): PackageManifest {
  const copied = { ...pkg };

  for (const section of packageSections) {
    const deps = pkg[section];
    if (!deps) {
      continue;
    }

    const resolved = Object.fromEntries(
      Object.entries(deps).map(([depName, depVersion]) => [
        depName,
        resolveCatalogVersion(workspace, depName, depVersion) || depVersion,
      ]),
    );

    copied[section] = resolved;
  }

  return copied;
}

/**
 * Lists every package in the workspace by expanding the `packages` globs in
 * pnpm-workspace.yaml.
 */
export async function getWorkspacePackages(
  workspace: WorkspaceManifest,
): Promise<WorkspacePackage[]> {
  const { packages } = workspace;

  const exclude = packages.filter((p) => p.startsWith('!')).map((p) => p.slice(1));
  const patterns = packages.filter((p) => !p.startsWith('!')).map((p) => `${p}/package.json`);

  // `exclude`, not `ignore` — node:fs/promises.glob silently ignores unknown
  // options, so `ignore` would be a no-op and the negated workspace entries
  // wouldn't be pruned.
  const files = await Array.fromAsync(glob(patterns, { exclude, cwd: ROOT_DIR }));

  return Promise.all(
    files.map(async (file) => {
      const manifest = await readJson<WorkspacePackage['manifest']>(resolve(ROOT_DIR, file));
      return {
        name: manifest.name,
        manifest,
        pkgPath: file,
        dir: dirname(file),
      };
    }),
  );
}

/**
 * Lists all currently publishable package names in the workspace: packages
 * that are neither private nor listed in `versioning.ignore`.
 */
export async function getPublishablePackages(
  workspace: WorkspaceManifest,
): Promise<WorkspacePackage[]> {
  const ignoredPackages = new Set(workspace.versioning?.ignore ?? []);
  const pkgs = await getWorkspacePackages(workspace);

  return pkgs.filter((pkg) => !pkg.manifest.private && !ignoredPackages.has(pkg.name));
}

/**
 * Gets all packages covered by a changeset since the given commit hash
 *
 * @param baseCommit - The commit hash to compare against.
 * @param headCommit - The commit hash to compare to, defaults to HEAD.
 */
export async function getPackagesWithChangset(
  baseCommit: string,
  headCommit = 'HEAD',
): Promise<Set<string>> {
  const [changes, newChangesets] = await Promise.all([
    readChangeIntents(ROOT_DIR),
    getChangedFiles(CHANGES_DIR, baseCommit, headCommit, true),
  ]);

  const newChangesetFiles = new Set(newChangesets.map((file) => resolve(ROOT_DIR, file)));

  return new Set(
    changes.flatMap((change) => {
      if (!newChangesetFiles.has(change.filePath)) {
        return [];
      }

      return Object.keys(change.releases);
    }),
  );
}

/**
 * Finds publishable packages that changed between two refs but have no changeset
 * covering them. A package counts as changed when a file in its directory
 * changed (respecting ignorePatterns), it is new (absent from the base commit),
 * or a catalog entry it references was bumped.
 *
 * @param baseCommit - The ref to compare against.
 * @param headCommit - The ref to compare to. Empty compares against the working
 *   tree (uncommitted changes).
 * @param ignorePatterns - Path globs that never warrant a release.
 * @returns Names of packages missing a changeset.
 */
export async function findPackagesNeedingChangeset(
  baseCommit: string,
  headCommit = 'HEAD',
  ignorePatterns: string[] = [],
): Promise<string[]> {
  const workspace = await getWorkspace();
  if (!workspace) {
    throw new Error('Could not load workspace manifest');
  }

  const projects = await getPublishablePackages(workspace);
  if (!projects?.length) {
    return [];
  }

  const baseWorkspace = await loadWorkspace(baseCommit);

  const packageHasChanges = async (project: WorkspacePackage): Promise<boolean> => {
    if (await pathHasChanges(project.dir, baseCommit, headCommit, ignorePatterns)) {
      return true;
    }

    const basePkg = await loadPackage(baseCommit, project.pkgPath);
    if (!basePkg) {
      // no base package.json — this is a new package
      return true;
    }

    // An empty base manifest has no catalog, so a catalog dep throws here.
    const resolvedBase = resolvePackageCatalog(baseWorkspace!, basePkg);
    const resolvedHead = resolvePackageCatalog(workspace, project.manifest);
    return !isDeepStrictEqual(resolvedBase, resolvedHead);
  };

  const changedPackages = await getPackagesWithChangset(baseCommit, headCommit);

  const results = await Promise.all(
    projects.map(async (project) => {
      const hasChanges = await packageHasChanges(project);
      return hasChanges && !changedPackages.has(project.name) ? project.name : null;
    }),
  );

  return results.filter((name): name is string => Boolean(name));
}
