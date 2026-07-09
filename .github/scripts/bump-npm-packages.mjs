#!/usr/bin/env node

/**
 * bump-npm-packages.mjs — interactive helper to bump npm-release packages.
 *
 * Run on a branch (`pnpm bump:packages`) when you want to publish a new
 * version of one or more bucket packages. It:
 *
 *   1. Finds packages with unreleased changes since the last stable release
 *      (per-package git diff — precise, unlike nx affected against a distant
 *      base, which flags everything via shared globals).
 *   2. Skips ones already bumped ahead of npm (a pending publish).
 *   3. Prompts for a patch/minor/major bump on each changed package.
 *   4. Cascades: a minor/major bump breaks consumers' published workspace:~
 *      ranges, so their patch bumps are added automatically (transitively).
 *   5. Writes the versions and commits. You review and open the PR; merging it
 *      publishes via the publish_npm_packages_main CI lane.
 *
 * npm stays the source of truth for the patch line; nothing is committed back
 * automatically outside this deliberate flow.
 */

import {argv} from 'node:process';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

import semver from 'semver';
import enquirer from 'enquirer';

import {computeNextVersion, getPublishedVersions} from './compute-next-app-version.js';
import {
    ROOT_DIR,
    loadPackages,
    toposort,
    internalDependencyEdges
} from './lib/npm-release-packages.mjs';

function run(cmd, args, opts = {}) {
    return execFileSync(cmd, args, {cwd: ROOT_DIR, encoding: 'utf8', ...opts}).trim();
}

function ensureBranchAndClean() {
    if (run('git', ['branch', '--show-current']) === 'main') {
        throw new Error('Run this on a branch, not main.');
    }
    if (run('git', ['status', '--porcelain'])) {
        throw new Error('Working tree is dirty — commit or stash your changes first.');
    }
}

// Latest stable release tag (skip -rc/prereleases) — the "since last release" base.
function lastReleaseTag() {
    const tags = run('git', ['tag', '--list', 'v*', '--sort=-v:refname']).split('\n');
    return tags.find(t => t && !t.includes('-')) || null;
}

function dirChangedSince(base, dir) {
    return base ? run('git', ['diff', '--name-only', base, 'HEAD', '--', dir]).length > 0 : true;
}

function highestPublished(publishedVersions, fallback) {
    const stable = publishedVersions.filter(v => semver.valid(v) && !semver.prerelease(v));
    return stable.sort(semver.rcompare)[0] || fallback;
}

// The concrete published range a consumer's workspace spec resolves to.
function publishedRange(spec, depVersion) {
    if (!spec.startsWith('workspace:')) {
        return null;
    }
    const suffix = spec.slice('workspace:'.length);
    if (suffix === '~' || suffix === '^') {
        return `${suffix}${depVersion}`;
    }
    if (suffix === '*' || suffix === '') {
        return depVersion;
    }
    return suffix;
}

/**
 * Given the packages being (re)published and the dependency edges, return the
 * cascade: consumers whose published range can't resolve a republished
 * dependency's new version and so must be patch-bumped too. Transitive.
 *
 * @param {Map<string, string>} republishing name -> version being published
 * @param {Array} edges internalDependencyEdges()
 * @param {Map<string, {highest: string, next: string}>} npmInfo per package
 * @returns {Map<string, string>} consumer name -> cascade patch version
 */
export function computeCascade(republishing, edges, npmInfo) {
    const publishing = new Map(republishing);
    const cascade = new Map();

    let changed = true;
    while (changed) {
        changed = false;
        for (const {dependent, dependency, spec} of edges) {
            if (!publishing.has(dependency.name) || publishing.has(dependent.name)) {
                continue;
            }
            const range = publishedRange(spec, npmInfo.get(dependency.name).highest);
            if (range && !semver.satisfies(publishing.get(dependency.name), range)) {
                const next = npmInfo.get(dependent.name).next;
                publishing.set(dependent.name, next);
                cascade.set(dependent.name, next);
                changed = true;
            }
        }
    }
    return cascade;
}

async function main() {
    ensureBranchAndClean();

    const base = lastReleaseTag();
    const packages = toposort(loadPackages());
    const edges = internalDependencyEdges(packages);

    // One round of npm lookups up front.
    const npmInfo = new Map();
    for (const p of packages) {
        const published = getPublishedVersions(p.name);
        npmInfo.set(p.name, {
            published,
            highest: highestPublished(published, p.version),
            next: computeNextVersion(p.version, published),
            onNpm: published.includes(p.version)
        });
    }

    const republishing = new Map(); // name -> version to publish
    const bumps = new Map();        // name -> version (needs writing to package.json)

    // Already-bumped-but-unpublished packages will publish on merge; include them
    // as "republishing" so their consumers still cascade, but don't re-prompt.
    for (const p of packages) {
        if (!npmInfo.get(p.name).onNpm) {
            republishing.set(p.name, p.version);
        }
    }

    // Phase 1: prompt for each package with unreleased changes.
    for (const p of packages) {
        if (republishing.has(p.name)) {
            console.log(`• ${p.name}: already at ${p.version} (not on npm — publishes on merge), skipping`);
            continue;
        }
        if (!dirChangedSince(base, p.dir)) {
            continue;
        }

        const {highest, next} = npmInfo.get(p.name);
        const effective = semver.gt(highest, p.version) ? highest : p.version;
        const options = {patch: next, minor: semver.inc(effective, 'minor'), major: semver.inc(effective, 'major')};

        const {answer} = await enquirer.prompt({
            type: 'select',
            name: 'answer',
            message: `${p.name}  (changed since ${base}, npm latest ${highest})`,
            choices: [
                {name: 'patch', message: `patch  → ${options.patch}`},
                {name: 'minor', message: `minor  → ${options.minor}`},
                {name: 'major', message: `major  → ${options.major}`},
                {name: 'skip', message: 'skip   (leave unchanged)'}
            ]
        });

        if (answer === 'skip') {
            continue;
        }
        republishing.set(p.name, options[answer]);
        bumps.set(p.name, options[answer]);
    }

    // Phase 2: cascade patch bumps to consumers whose ranges the phase-1
    // minor/major bumps break.
    const cascade = computeCascade(republishing, edges, npmInfo);
    for (const [name, version] of cascade) {
        bumps.set(name, version);
    }

    if (bumps.size === 0) {
        console.log('\nNothing to bump.');
        return;
    }

    console.log('\nWill bump:');
    for (const p of packages) {
        if (bumps.has(p.name)) {
            const why = cascade.has(p.name) ? ' (cascade — consumer of a minor/major bump)' : '';
            console.log(`  ${p.name} → ${bumps.get(p.name)}${why}`);
        }
    }

    const {ok} = await enquirer.prompt({
        type: 'confirm',
        name: 'ok',
        message: 'Write these versions and commit?',
        initial: true
    });
    if (!ok) {
        console.log('Aborted.');
        return;
    }

    // Write in dependency order so the commit is deterministic.
    for (const p of packages) {
        if (bumps.has(p.name)) {
            run('npm', ['pkg', 'set', `version=${bumps.get(p.name)}`], {cwd: `${ROOT_DIR}/${p.dir}`});
        }
    }

    const summary = packages.filter(p => bumps.has(p.name)).map(p => `  - ${p.name}@${bumps.get(p.name)}`);
    run('git', ['add', ...packages.filter(p => bumps.has(p.name)).map(p => `${p.dir}/package.json`)]);
    run('git', ['commit', '-m', `Bumped npm-release packages\n\n${summary.join('\n')}`]);

    console.log(`\nCommitted:\n${summary.join('\n')}`);
    console.log('\nReview the commit and open a PR — merging to main publishes these to npm.');
}

// Only run when invoked directly (keeps computeCascade importable for tests).
if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
    main().catch((error) => {
        // enquirer rejects with '' (or no message) when a prompt is cancelled
        // with Ctrl+C — treat that as a clean abort rather than an error.
        if (!error || !error.message) {
            console.log('\nAborted.');
            process.exit(130);
        }
        console.error(error.message);
        process.exit(1);
    });
}

