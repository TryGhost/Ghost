import {glob} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {isDeepStrictEqual} from 'node:util'
import {load} from 'js-yaml'
import {
    readWorkspaceManifest,
    validateWorkspaceManifest
} from '@pnpm/workspace.workspace-manifest-reader'
import {readChangeIntents, CHANGES_DIR} from '@pnpm/releasing.versioning';

import {ROOT_DIR} from './constants.js';
import {getFileFromCommit, getChangedFiles, pathHasChanges} from './git.js';
import {readJson} from './utils.js';

const WORKSPACE_MANIFEST_FILE = 'pnpm-workspace.yaml';

export const getWorkspace = () => readWorkspaceManifest(ROOT_DIR);

/**
 * @typedef {import('@pnpm/workspace.workspace-manifest-reader').WorkspaceManifest} WorkspaceManifest
 */

/**
 * Loads workspace manifest contents at a specific commit hash
 *
 * @param {string} commitHash - The commit hash to load the workspace manifest from
 * @returns {Promise<WorkspaceManifest>} - The workspace manifest object
 */
export async function loadWorkspace(commitHash) {
    const fileContent = await getFileFromCommit(commitHash, WORKSPACE_MANIFEST_FILE);
    if (!fileContent) {
        throw new Error(`Could not find ${WORKSPACE_MANIFEST_FILE} in commit ${commitHash}`);
    }

    const workspace = load(fileContent);
    validateWorkspaceManifest(workspace);
    return workspace;
}

export async function loadPackage(commitHash, packagePath) {
    // allowMissing: a package absent from the base commit is a new package, not
    // an error. getFileFromCommit returns null and we treat it as such, so the
    // caller follows the changeset-required path. Invalid commits still throw.
    const fileContent = await getFileFromCommit(commitHash, packagePath, {allowMissing: true});
    if (!fileContent) {
        // file does not exist in this commit, return null to indicate that
        // this is a new package
        return null;
    }

    return JSON.parse(fileContent);
}

const packageSections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const catalogRegex = /^catalog:([\w.-]+)?$/;

/**
 * Resovles a version from the workspace catalog. Throws if not found in the catalog
 *
 * @param {WorkspaceManifest} workspace - The workspace manifest object.
 * @param {string} depName - The name of the dependency to resolve.
 * @param {string} depVersion - The version of the dependency to resolve.
 * @returns {string | null} - The resolved version from the catalog, null if not a catalog dep
 */
function resolveCatalogVersion(workspace, depName, depVersion) {
    const match = catalogRegex.exec(depVersion);
    if (!match) {
        return null;
    }

    const catalogName = match[1];
    const version = catalogName
        ? workspace.catalogs?.[catalogName]?.[depName]
        : workspace.catalog?.[depName];

    if (!version) {
        throw new Error(`Could not resolve catalog dependency ${depName} from catalog ${catalogName || 'default'}`);
    }

    return version;
}

/**
 * resolves the package dependencies from the pnpm-workspace.yaml file for a given
 * commit and package path.
 *
 * @param {WorkspaceManifest} workspace - The workspace manifest object.
 * @param {object} pkg - The package.json object to resolve dependencies for.
 *
 * @returns {object} - The package.json object with resolved dependencies.
 */
export function resolvePackageCatalog(workspace, pkg) {
    const copied = {...pkg};

    for (const section of packageSections) {
        const deps = pkg[section];
        if (!deps) {
            continue;
        }

        const resolved = Object.fromEntries(
            Object.entries(deps).map(([depName, depVersion]) => [
                depName,
                resolveCatalogVersion(workspace, depName, depVersion) || depVersion
            ])
        );

        copied[section] = resolved;
    }

    return copied;
}

/**
 * @typedef {Object} PublishablePackage
 * @property {string} name - The name of the package.
 * @property {string} pkgPath - The path to the package.json file.
 * @property {object} manifest - The parsed package.json content.
 * @property {string} dir - The path to the package dir.
 */

/**
 * Lists all currently publishable package names in the workspace, leveraging
 * the pnpm-workspace.yaml file and the package.json files in the workspace.
 *
 * Uses the same logic as `.pnpmfile.mjs` to determine which packages are publishable.
 *
 * @param {WorkspaceManifest} workspace - The workspace manifest object.
 * @returns {Promise<PublishablePackage[]>} - An array of publishable package objects.
 */
export async function getPublishablePackages(workspace) {
    const {packages, versioning = {}} = workspace;
    const igoredPackages = new Set(versioning.ignore ?? []);

    const exclude = packages
        .filter(p => p.startsWith('!'))
        .map(p => p.slice(1));
    const patterns = packages
        .filter(p => !p.startsWith('!'))
        .map(p => `${p}/package.json`);

    // `exclude`, not `ignore` — node:fs/promises.glob silently ignores unknown
    // options, so `ignore` would be a no-op and the negated workspace entries
    // wouldn't be pruned.
    const files = await Array.fromAsync(glob(patterns, {exclude, cwd: ROOT_DIR}));

    const pkgs = await Promise.all(
        files.map(async (file) => {
            const pkg = await readJson(resolve(ROOT_DIR, file));
            if (pkg.private || igoredPackages.has(pkg.name)) {
                return null;
            }

            return {
                name: pkg.name,
                manifest: pkg,
                pkgPath: file,
                dir: dirname(file)
            };
        })
    );

    return pkgs.filter(Boolean);
}

/**
 * Gets all packages covered by a changeset since the given commit hash
 *
 * @param {string} baseCommit - The commit hash to compare against.
 * @param {string?} headCommit - The commit hash to compare to, defaults to HEAD.
 */
export async function getPackagesWithChangset(baseCommit, headCommit = 'HEAD') {
    const [changes, newChangesets] = await Promise.all([
        readChangeIntents(ROOT_DIR),
        getChangedFiles(CHANGES_DIR, baseCommit, headCommit, true)
    ]);

    const newChangesetFiles = new Set(
        newChangesets.map((file) => resolve(ROOT_DIR, file))
    );

    return new Set(
        changes.flatMap((change) => {
            if (!newChangesetFiles.has(change.filePath)) {
                return [];
            }

            return Object.keys(change.releases);
        })
    );
}

/**
 * Finds publishable packages that changed between two refs but have no changeset
 * covering them. A package counts as changed when a file in its directory
 * changed (respecting ignorePatterns), it is new (absent from the base commit),
 * or a catalog entry it references was bumped.
 *
 * @param {string} baseCommit - The ref to compare against.
 * @param {string} [headCommit='HEAD'] - The ref to compare to. Empty compares
 *   against the working tree (uncommitted changes).
 * @param {string[]} [ignorePatterns] - Path globs that never warrant a release.
 * @returns {Promise<string[]>} - Names of packages missing a changeset.
 */
export async function findPackagesNeedingChangeset(baseCommit, headCommit = 'HEAD', ignorePatterns = []) {
    const workspace = await getWorkspace();
    if (!workspace) {
        throw new Error('Could not load workspace manifest');
    }

    const projects = await getPublishablePackages(workspace);
    if (!projects?.length) {
        return [];
    }

    const baseWorkspace = await loadWorkspace(baseCommit);

    async function packageHasChanges(project) {
        if (await pathHasChanges(project.dir, baseCommit, headCommit, ignorePatterns)) {
            return true;
        }

        const basePkg = await loadPackage(baseCommit, project.pkgPath);
        if (!basePkg) {
            // no base package.json — this is a new package
            return true;
        }

        const resolvedBase = resolvePackageCatalog(baseWorkspace, basePkg);
        const resolvedHead = resolvePackageCatalog(workspace, project.manifest);
        return !isDeepStrictEqual(resolvedBase, resolvedHead);
    }

    const changedPackages = await getPackagesWithChangset(baseCommit, headCommit);

    const results = await Promise.all(projects.map(async (project) => {
        const hasChanges = await packageHasChanges(project);
        return hasChanges && !changedPackages.has(project.name)
            ? project.name
            : null;
    }));

    return results.filter(Boolean);
}
