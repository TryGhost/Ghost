#!/usr/bin/env node

/**
 * check-npm-package-versions.mjs — PR-time consistency guard for the
 * npm-release package bucket.
 *
 * When a package is published, its `workspace:~` (or ^/*) dependencies are
 * rewritten to a concrete range pinned to the dependency's version at publish
 * time. A `~1.1.3` range absorbs later patches but not a new minor/major. So if
 * a PR bumps a dependency's minor/major without also bumping its consumers, the
 * consumers' already-published ranges go stale — external installs keep
 * resolving the old line.
 *
 * The bump helper surfaces this cascade automatically (it lists dependents as
 * candidates). This guard is the backstop for a hand-edited version that
 * bypasses the helper: it fails the PR if a bumped dependency would leave any
 * consumer's current range unable to resolve the new version, unless that
 * consumer is also bumped (and will therefore be republished with a fresh
 * range). devDependencies are ignored — consumers never install them.
 *
 * Dependency-free (no semver) on purpose: it runs in job_app_version_bump_check,
 * which has no `pnpm install` step (like its sibling check-app-version-bump.js).
 *
 * Usage: PR_BASE_SHA=<sha> node check-npm-package-versions.mjs
 *        node check-npm-package-versions.mjs --base <ref>
 */

import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';

import {ROOT_DIR, loadPackages, internalDependencyEdges} from './lib/npm-release-packages.mjs';

// Fail closed if the base ref can't be resolved: without it every package reads
// as "new" and the guard passes green having checked nothing. The job fetches
// `origin main`, so a PR against a non-main base whose branch has advanced can
// land here with an unreachable base.sha — better to error loudly than skip.
function assertRefResolves(baseRef) {
    try {
        execFileSync('git', ['rev-parse', '--verify', '--quiet', `${baseRef}^{commit}`], {
            cwd: ROOT_DIR,
            stdio: ['ignore', 'ignore', 'ignore']
        });
    } catch {
        throw new Error(
            `Base ref '${baseRef}' could not be resolved — cannot diff package versions against it. `
            + `Ensure it is fetched (this guard fetches origin main; a non-main PR base may need fetching too).`
        );
    }
}

// The version a bucket package had on the base ref, or null if it didn't exist
// there (a package added in this PR). The ref is validated up front, so a
// `git show` miss here means the path wasn't in that tree — a genuinely new
// package, not an unresolvable ref.
function baseVersion(entry, baseRef) {
    try {
        const json = execFileSync('git', ['show', `${baseRef}:${entry.dir}/package.json`], {
            cwd: ROOT_DIR,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        });
        return JSON.parse(json).version;
    } catch {
        return null;
    }
}

// Parse "major.minor.patch" (ignoring any prerelease/build suffix) into numbers.
function parseVersion(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
    return match ? {major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3])} : null;
}

// Whether publishing `next` of a dependency breaks a consumer whose workspace
// spec was pinned against `base` at publish time. Mirrors the ranges pnpm writes
// for workspace: specs — `~` tolerates only patch bumps, `^` tolerates minor+patch
// (major-0 lines tolerate only patch), `*`/exact tolerate nothing — without
// pulling in the semver package (this runs in an install-free CI job).
function rangeBreaks(spec, baseVersion, nextVersion) {
    if (!spec.startsWith('workspace:') || nextVersion === baseVersion) {
        return false;
    }
    const base = parseVersion(baseVersion);
    const next = parseVersion(nextVersion);
    if (!base || !next) {
        return false; // unparseable — don't block
    }
    switch (spec.slice('workspace:'.length)) {
    case '~':
        return next.major !== base.major || next.minor !== base.minor;
    case '^':
        return base.major >= 1
            ? next.major !== base.major
            : next.major !== 0 || next.minor !== base.minor;
    default:
        // '*', '' (exact pin), or an explicit range — treat conservatively.
        return true;
    }
}

function main() {
    const {values} = parseArgs({options: {base: {type: 'string'}}});
    const baseRef = values.base ?? process.env.PR_BASE_SHA;
    if (!baseRef) {
        throw new Error('Missing base ref: set PR_BASE_SHA or pass --base <ref>');
    }
    assertRefResolves(baseRef);

    const packages = loadPackages();
    const byName = new Map(packages.map(p => [p.name, p]));
    const baseVersions = new Map(packages.map(p => [p.name, baseVersion(p, baseRef)]));

    // A consumer that is itself being bumped (or is new) will republish with a
    // refreshed range, so it doesn't need flagging.
    const isRepublished = (name) => {
        const base = baseVersions.get(name);
        return base == null || byName.get(name).version !== base;
    };

    const violations = [];

    for (const {dependent, dependency, spec} of internalDependencyEdges(packages)) {
        const depBase = baseVersions.get(dependency.name);
        if (!depBase) {
            continue; // dependency is new — no stale published range to worry about
        }
        if (!rangeBreaks(spec, depBase, dependency.version)) {
            continue; // patch bump (or no bump) — absorbed by the consumer's range
        }
        if (!isRepublished(dependent.name)) {
            violations.push(
                `${dependent.name} depends on ${dependency.name} (${spec}, pinned to ${depBase}), `
                + `but ${dependency.name} is bumped to ${dependency.version} which that range can't resolve. `
                + `Bump ${dependent.name} too so it republishes with a refreshed range.`
            );
        }
    }

    if (violations.length) {
        throw new Error(
            'npm-release dependency consistency check failed:\n- ' + violations.join('\n- ')
            + '\n\nA minor/major bump of a package must also bump its consumers (a patch bump is enough).'
        );
    }

    console.log('npm-release dependency consistency check passed.');
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
