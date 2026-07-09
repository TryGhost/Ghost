#!/usr/bin/env node

/**
 * publish-npm-packages.mjs — publish workspace packages tagged for npm release.
 *
 * Membership in this bucket is declared per-package via the nx tag
 * `npm-release` (package.json → nx.tags), so it isn't coupled to any one
 * directory — koenig/* today, other workspaces later just add the tag. Ghost
 * itself never installs these from npm (dev/CI resolve them from the workspace,
 * the production archive embeds them as component tarballs); publishing exists
 * for external consumers only.
 *
 * Two lanes, one script:
 *
 *   <currentTag>   Release (tag) lane — runs after publish_ghost. For each
 *                  tagged package whose directory changed since the previous
 *                  release tag, compute the next patch (package.json pins the
 *                  major.minor line, npm is the source of truth for the patch)
 *                  and publish. Nothing is committed back.
 *
 *   --on-main      Main lane — reconciles npm to the repo: publish any tagged
 *                  package whose exact package.json version isn't on npm yet.
 *                  This is what ships a manual version bump (any level) once its
 *                  PR merges. A no-op when nothing is ahead of npm.
 *
 * Packages are processed in dependency order so workspace:~ specs are rewritten
 * to the versions published earlier in the same run.
 *
 * Usage: node publish-npm-packages.mjs <currentTag> [--dry-run]
 *        node publish-npm-packages.mjs --on-main [--dry-run]
 */

import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';

// compute-next-app-version.js is CommonJS; Node exposes its module.exports as
// named ESM imports via cjs-module-lexer.
import {computeNextVersion, getPublishedVersions} from './compute-next-app-version.js';
import {ROOT_DIR, loadPackages, toposort} from './lib/npm-release-packages.mjs';

function run(cmd, args, opts = {}) {
    return execFileSync(cmd, args, {cwd: ROOT_DIR, encoding: 'utf8', ...opts});
}

// Build (if the package has a build target) and publish a single package at the
// given version. Writes the version before building so anything baked into the
// build output matches what we publish.
function buildAndPublish(entry, version, {dryRun}) {
    const pkgDir = path.join(ROOT_DIR, entry.dir);

    console.log(`\nPublishing ${entry.name}@${version}${dryRun ? ' (dry run)' : ''}`);

    run('npm', ['pkg', 'set', `version=${version}`], {cwd: pkgDir});

    // Some packages (e.g. kg-simplemde) ship prebuilt sources with no build target.
    if (entry.pkg.scripts && entry.pkg.scripts.build) {
        run('pnpm', ['nx', 'build', entry.name], {stdio: 'inherit'});
    }

    const publishArgs = ['publish', '--access', 'public', '--no-git-checks'];
    if (dryRun) {
        publishArgs.push('--dry-run');
    }
    run('pnpm', publishArgs, {cwd: pkgDir, stdio: 'inherit'});
}

// Release (tag) lane: publish the next patch for every tagged package whose
// directory changed since the previous release tag.
function publishForTag(packages, currentTag, {dryRun}) {
    let previousTag = null;
    try {
        previousTag = run('git', ['describe', '--tags', '--abbrev=0', '--match', 'v*', `${currentTag}^`]).trim();
    } catch {
        console.log('No previous release tag found — treating all packages as changed');
    }

    const published = [];
    const skipped = [];

    for (const entry of packages) {
        if (previousTag) {
            const diff = run('git', ['diff', '--name-only', previousTag, currentTag, '--', entry.dir]).trim();
            if (!diff) {
                skipped.push(entry.name);
                continue;
            }
        }

        const nextVersion = computeNextVersion(entry.pkg.version, getPublishedVersions(entry.name));
        buildAndPublish(entry, nextVersion, {dryRun});
        published.push(`${entry.name}@${nextVersion}`);
    }

    console.log(`\nPublished (${published.length}): ${published.join(', ') || 'none'}`);
    console.log(`Unchanged since ${previousTag || 'n/a'} (${skipped.length}): ${skipped.join(', ') || 'none'}`);
}

// Main lane: publish any tagged package whose exact package.json version isn't
// on npm yet (i.e. a manual bump that just merged). Idempotent — a no-op when
// every version is already published.
function publishForMain(packages, {dryRun}) {
    const published = [];
    const skipped = [];

    for (const entry of packages) {
        if (getPublishedVersions(entry.name).includes(entry.version)) {
            skipped.push(`${entry.name}@${entry.version}`);
            continue;
        }
        buildAndPublish(entry, entry.version, {dryRun});
        published.push(`${entry.name}@${entry.version}`);
    }

    console.log(`\nPublished (${published.length}): ${published.join(', ') || 'none'}`);
    console.log(`Already on npm (${skipped.length}): ${skipped.join(', ') || 'none'}`);
}

function main() {
    const {values, positionals} = parseArgs({
        options: {
            'dry-run': {type: 'boolean', default: false},
            'on-main': {type: 'boolean', default: false}
        },
        allowPositionals: true
    });

    const dryRun = values['dry-run'];
    const onMain = values['on-main'];
    const currentTag = positionals[0] ?? null;

    if (!currentTag && !onMain) {
        throw new Error('Usage: publish-npm-packages.mjs <currentTag> [--dry-run] | --on-main [--dry-run]');
    }

    const packages = toposort(loadPackages());

    if (onMain) {
        publishForMain(packages, {dryRun});
        return;
    }

    publishForTag(packages, currentTag, {dryRun});
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
