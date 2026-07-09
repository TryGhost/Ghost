/**
 * Shared discovery for the npm-release package bucket.
 *
 * Membership is declared per-package via the nx tag `npm-release`
 * (package.json → nx.tags), so it isn't coupled to any one directory. Both the
 * publisher (publish-npm-packages.mjs) and the PR-time consistency guard
 * (check-npm-package-versions.mjs) resolve the bucket through here so they can
 * never disagree about what it contains.
 */

import fs, {globSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// nx tag that opts a package into this publish bucket.
export const RELEASE_TAG = 'npm-release';

// Workspace package globs from pnpm-workspace.yaml (e.g. 'apps/*', 'koenig/*').
// Read from pnpm rather than hard-coded so a new workspace root is picked up.
function loadWorkspaceGlobs() {
    const yaml = fs.readFileSync(path.join(ROOT_DIR, 'pnpm-workspace.yaml'), 'utf8');
    const lines = yaml.split('\n');
    const start = lines.findIndex(line => /^packages:/.test(line));
    if (start === -1) {
        return [];
    }
    const globs = [];
    for (const line of lines.slice(start + 1)) {
        const match = line.match(/^\s+-\s+['"]?([^'"]+?)['"]?\s*$/);
        if (!match) {
            break; // end of the packages: block
        }
        globs.push(match[1]);
    }
    return globs;
}

// Every non-private workspace package carrying the npm-release tag. `dir` is the
// workspace-relative directory (e.g. 'koenig/kg-utils'). Each workspace glob is
// resolved to its package.json files with fs.glob (so only existing manifests
// are returned); the results are sorted for deterministic ordering.
export function loadPackages() {
    const patterns = loadWorkspaceGlobs().map(glob => `${glob}/package.json`);
    return globSync(patterns, {cwd: ROOT_DIR})
        .sort()
        .map((rel) => {
            const pkgPath = path.join(ROOT_DIR, rel);
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            return {dir: path.dirname(rel), name: pkg.name, version: pkg.version, private: !!pkg.private, pkg, pkgPath};
        })
        .filter(entry => !entry.private
            && entry.pkg.nx
            && Array.isArray(entry.pkg.nx.tags)
            && entry.pkg.nx.tags.includes(RELEASE_TAG));
}

// Order packages so dependencies publish before dependents. workspace: specs in
// every field (incl. devDependencies) are rewritten at publish time, so a
// dependency bumped earlier in the run is reflected wherever it's referenced.
export function toposort(packages) {
    const byName = new Map(packages.map(p => [p.name, p]));
    const sorted = [];
    const visiting = new Set();
    const visited = new Set();

    function visit(entry) {
        if (visited.has(entry.name)) {
            return;
        }
        if (visiting.has(entry.name)) {
            throw new Error(`Dependency cycle involving ${entry.name}`);
        }
        visiting.add(entry.name);
        const deps = {...entry.pkg.dependencies, ...entry.pkg.devDependencies};
        for (const depName of Object.keys(deps)) {
            if (byName.has(depName)) {
                visit(byName.get(depName));
            }
        }
        visiting.delete(entry.name);
        visited.add(entry.name);
        sorted.push(entry);
    }

    packages.forEach(visit);
    return sorted;
}

// Consumer-facing internal dependency edges within the bucket: for each package,
// the other bucket packages it ships as a runtime dependency (prod, peer, or
// optional) and the workspace spec it uses. devDependencies are excluded — they
// aren't installed by consumers of the published package, so a dev-only bump
// never leaves a consumer with a stale transitive range.
export function internalDependencyEdges(packages) {
    const byName = new Map(packages.map(p => [p.name, p]));
    const edges = [];
    for (const entry of packages) {
        const deps = {
            ...entry.pkg.dependencies,
            ...entry.pkg.peerDependencies,
            ...entry.pkg.optionalDependencies
        };
        for (const [depName, spec] of Object.entries(deps)) {
            if (byName.has(depName)) {
                edges.push({dependent: entry, dependency: byName.get(depName), spec});
            }
        }
    }
    return edges;
}
