import {existsSync} from 'node:fs';
import {join, relative} from 'node:path';
import {execSync} from 'node:child_process';
import {parseArgs as baseParseArgs} from 'node:util';
import semver from 'semver';
import camelcaseKeys from 'camelcase-keys';
import {setTimeout} from 'node:timers/promises';

import {ROOT_DIR} from './lib/constants.js';
import {resolveBaseTag} from './lib/resolve-base-tag.js';
import {readJsonSync, writeJsonSync} from './lib/utils.js';

const GHOST_CORE_PKG = join(ROOT_DIR, 'ghost/core/package.json');
const GHOST_ADMIN_PKG = join(ROOT_DIR, 'apps/ember-admin/package.json');
const CASPER_DIR = join(ROOT_DIR, 'ghost/core/content/themes/casper');
const SOURCE_DIR = join(ROOT_DIR, 'ghost/core/content/themes/source');

const MAX_WAIT_MS = 30 * 60 * 1000; // 30 minutes
const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

// --- Argument parsing ---

function parseArgs() {
    // Defaults fall back to RELEASE_* env vars so CI can set them on the job and
    // invoke the script bare (a passed CLI flag still wins). Booleans read the
    // literal string "true".
    const env = process.env;
    const {values} = baseParseArgs({
        options: {
            'bump-type': {type: 'string', default: env.RELEASE_BUMP_TYPE || 'auto'},
            'branch': {type: 'string', default: env.RELEASE_BRANCH || 'main'},
            'dry-run': {type: 'boolean', default: env.RELEASE_DRY_RUN === 'true'},
            'skip-checks': {type: 'boolean', default: env.RELEASE_SKIP_CHECKS === 'true'},
            // Version and commit the pending package changesets without touching
            // Ghost's version, cutting a tag, or publishing. Publishing is a
            // separate step (the "Publish Packages" workflow_dispatch).
            'packages-only': {type: 'boolean', default: env.RELEASE_PACKAGES_ONLY === 'true'}
        },
    });

    return camelcaseKeys(values);
}

// --- Helpers ---

function run(cmd, opts = {}) {
    const result = execSync(cmd, {cwd: ROOT_DIR, encoding: 'utf8', ...opts});
    return result.trim();
}

function readPkgVersion(pkgPath) {
    return readJsonSync(pkgPath).version;
}

function writePkgVersion(pkgPath, version) {
    const pkg = readJsonSync(pkgPath);
    pkg.version = version;
    writeJsonSync(pkgPath, pkg);
}

function log(msg) {
    console.log(`  ${msg}`);
}

function logStep(msg) {
    console.log(`\n▸ ${msg}`);
}

// Consume changesets → version the publishable workspace packages. `pnpm
// version -r` reads .changeset/, writes each package's new version, rewrites
// dependent workspace ranges, and deletes the consumed intents. Recursive mode
// never creates its own commit or tag, so the caller commits the result.
function applyChangesetVersions() {
    if (!existsSync(join(ROOT_DIR, '.changeset'))) {
        log('No .changeset directory — nothing to version');
        return;
    }
    // --no-git-checks: the working tree is intentionally dirty here — the normal
    // release has already written the Ghost version bumps (committed together
    // below), and the packages-only path commits straight after. `pnpm version
    // -r` refuses on an unclean tree by default.
    run('pnpm version -r --no-git-checks');
}

// --- Version detection ---

function detectBumpType(baseTag, bumpType) {
    // Check for new migration files
    const migrationsPath = 'ghost/core/core/server/data/migrations/versions/';
    try {
        const addedFiles = run(`git diff --diff-filter=A --name-only ${baseTag} HEAD -- ${migrationsPath}`);
        if (addedFiles?.includes('core/')) {
            log('New migrations detected');
            if (bumpType === 'auto') {
                log('Auto-detecting: bumping to minor');
                bumpType = 'minor';
            }
        } else {
            log('No new migrations detected');
        }
    } catch {
        log('Warning: could not diff migrations');
    }

    // Check for feature commits (✨ or 🎉)
    try {
        const commits = run(`git log --oneline ${baseTag}..HEAD`);
        if (commits) {
            const featureCommits = commits.split('\n').filter(c => c.includes('✨') || c.includes('🎉') || c.includes(':sparkles:'));
            if (featureCommits.length) {
                log(`Feature commits detected (${featureCommits.length})`);
                if (bumpType === 'auto') {
                    log('Auto-detecting: bumping to minor');
                    bumpType = 'minor';
                }
            } else {
                log('No feature commits detected');
            }
        } else {
            log('No commits since base tag');
        }
    } catch {
        log('Warning: could not read commit log');
    }

    if (bumpType === 'auto') {
        log('Defaulting to patch');
        bumpType = 'patch';
    }

    return bumpType;
}

// --- CI check polling ---

const REQUIRED_CHECK_NAME = 'All required tests passed or skipped';

async function waitForChecks(commit) {
    logStep(`Waiting for CI checks on ${commit.slice(0, 8)}...`);

    const token = process.env.GITHUB_TOKEN || process.env.RELEASE_TOKEN;
    if (!token) {
        throw new Error('GITHUB_TOKEN or RELEASE_TOKEN required for check polling');
    }

    const startTime = Date.now();

    while (true) {
        const response = await fetch(`https://api.github.com/repos/TryGhost/Ghost/commits/${commit}/check-runs`, {
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github+json'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const {check_runs: checkRuns} = await response.json();

        // Find the required check — this is the CI gate that aggregates all mandatory checks
        const requiredCheck = checkRuns.find(r => r.name === REQUIRED_CHECK_NAME);

        if (requiredCheck) {
            if (requiredCheck.status === 'completed' && requiredCheck.conclusion === 'success') {
                log(`Required check "${REQUIRED_CHECK_NAME}" passed`);
                return;
            }
            if (requiredCheck.status === 'completed' && requiredCheck.conclusion !== 'success') {
                throw new Error(`Required check "${REQUIRED_CHECK_NAME}" failed (${requiredCheck.conclusion})`);
            }
            log(`Required check is ${requiredCheck.status}, waiting...`);
        } else {
            log('Required check not found yet, waiting...');
        }

        const elapsedMs = Date.now() - startTime;
        const elapsed = Math.round(elapsedMs / 1000);

        if (elapsedMs >= MAX_WAIT_MS) {
            throw new Error(`Timed out waiting for "${REQUIRED_CHECK_NAME}" after ${elapsed}s`);
        }

        log(`(${elapsed}s elapsed), polling in 30s...`);
        await setTimeout(POLL_INTERVAL_MS);
    }
}

// --- Theme submodule updates ---

function updateThemeSubmodule(themeDir, themeName) {
    if (!existsSync(themeDir)) {
        log(`${themeName} not present, skipping`);
        return false;
    }

    const currentVersion = readPkgVersion(join(themeDir, 'package.json'));

    // Checkout latest stable tag on main branch
    try {
        execSync(
            `git checkout $(git describe --abbrev=0 --tags $(git rev-list --tags --max-count=1 --branches=main))`,
            {cwd: themeDir, encoding: 'utf8', stdio: 'pipe'}
        );
    } catch (err) {
        log(`Warning: failed to update ${themeName}: ${err.message}`);
        return false;
    }

    const newVersion = readPkgVersion(join(themeDir, 'package.json'));

    if (semver.gt(newVersion, currentVersion)) {
        log(`${themeName} updated: v${currentVersion} → v${newVersion}`);
        run(`git add -f ${relative(ROOT_DIR, themeDir)}`);
        run(`git commit -m "🎨 Updated ${themeName} to v${newVersion}"`);
        return true;
    }

    log(`${themeName} already at latest (v${currentVersion})`);
    return false;
}

// --- Packages-only release ---

// Version and commit the pending package changesets without bumping Ghost,
// cutting a tag, or advancing the RC. Publishing happens separately (the
// "Publish Packages" workflow_dispatch, which publishes any committed version
// missing from npm), so this only needs to land the bumps on the branch.
async function runPackagesOnlyRelease(opts) {
    console.log('Ghost Packages-Only Release');
    console.log('===========================');
    log(`Branch: ${opts.branch}`);
    log(`Dry run: ${opts.dryRun}`);

    logStep('Applying changeset versions to publishable packages');
    applyChangesetVersions();

    // version -r writes package.json bumps, rewrites workspace ranges, removes
    // consumed changesets, and may touch the lockfile. Nothing staged means
    // there were no pending changesets to release.
    const changes = run('git status --porcelain');
    if (!changes) {
        log('No pending package changes to release');
        console.log('\n✓ Nothing to publish');
        return;
    }

    logStep('Committing package versions');
    run('git add -A');
    run('git commit -m "Versioned pending package changesets"');

    if (opts.dryRun) {
        logStep('DRY RUN — skipping push');
        log(`Would push branch ${opts.branch}`);
    } else {
        logStep('Pushing');
        run('git push origin HEAD');
        log('Pushed package version bumps');
    }

    console.log('\n✓ Packages-only release complete');
    log('Run the "Publish Packages" workflow to publish the new versions to npm');
}

// --- Main ---

async function main() {
    const opts = parseArgs();

    if (opts.packagesOnly) {
        await runPackagesOnlyRelease(opts);
        return;
    }

    console.log('Ghost Release Script');
    console.log('====================');
    log(`Branch: ${opts.branch}`);
    log(`Bump type: ${opts.bumpType}`);
    log(`Dry run: ${opts.dryRun}`);

    // 1. Read current version
    logStep('Reading current version');
    const currentVersion = readPkgVersion(GHOST_CORE_PKG);
    log(`Current version: ${currentVersion}`);

    // 2. Resolve base tag
    logStep('Resolving base tag');
    const {tag: baseTag, isPrerelease} = resolveBaseTag(currentVersion, ROOT_DIR);
    if (isPrerelease) {
        log(`Prerelease detected (${currentVersion}), resolved base tag: ${baseTag}`);
    } else {
        log(`Base tag: ${baseTag}`);
    }

    // 3. Detect bump type
    logStep('Detecting bump type');
    const resolvedBumpType = detectBumpType(baseTag, opts.bumpType);
    const newVersion = semver.inc(currentVersion, resolvedBumpType);
    if (!newVersion) {
        console.error(`Failed to calculate new version from ${currentVersion} with bump type ${resolvedBumpType}`);
        process.exit(1);
    }
    log(`Bump type: ${resolvedBumpType}`);
    log(`New version: ${newVersion}`);

    // 4. Check tag doesn't exist
    logStep('Checking remote tags');
    try {
        const tagCheck = run(`git ls-remote --tags origin refs/tags/v${newVersion}`);
        if (tagCheck) {
            console.error(`Tag v${newVersion} already exists on remote. Cannot release this version.`);
            process.exit(1);
        }
    } catch {
        // ls-remote returns non-zero if no match — that's what we want
    }
    log(`Tag v${newVersion} does not exist on remote`);

    // 5. Wait for CI checks
    if (!opts.skipChecks) {
        const headSha = run('git rev-parse HEAD');
        await waitForChecks(headSha);
    } else {
        log('Skipping CI checks');
    }

    // 6. Update theme submodules (main branch only)
    if (opts.branch === 'main') {
        logStep('Updating theme submodules');
        run('git submodule update --init');
        updateThemeSubmodule(CASPER_DIR, 'Casper');
        updateThemeSubmodule(SOURCE_DIR, 'Source');
    } else {
        logStep('Skipping theme updates (not main branch)');
    }

    // 7. Bump versions
    logStep(`Bumping version to ${newVersion}`);
    writePkgVersion(GHOST_CORE_PKG, newVersion);
    writePkgVersion(GHOST_ADMIN_PKG, newVersion);

    // 7b. Consume changesets → version the publishable workspace packages
    // (kg-*, packages/*, ...). These changes land in the Ghost release commit
    // below, tying every package version to the Ghost release that carries its
    // content; publishing (scripts/publish-packages.js) reads those off npm.
    logStep('Applying changeset versions to publishable packages');
    applyChangesetVersions();

    // 8. Commit and tag
    // Stage everything: the two Ghost manifests plus whatever `pnpm version -r`
    // touched (package.jsons, workspace-range rewrites, removed changesets,
    // pnpm-lock.yaml). Theme submodule bumps are already committed above.
    run('git add -A');
    run(`git commit -m "v${newVersion}"`);
    run(`git tag v${newVersion}`);
    log(`Created tag v${newVersion}`);

    // 9. Push
    if (opts.dryRun) {
        logStep('DRY RUN — skipping push');
        log(`Would push branch ${opts.branch} and tag v${newVersion}`);
    } else {
        logStep('Pushing');
        run('git push origin HEAD');
        run(`git push origin v${newVersion}`);
        log('Pushed branch and tag');
    }

    // 10. Advance to next RC
    // Default to the next patch RC. If a migration lands during the cycle,
    // ghost/core/bin/create-migration.js promotes this to the next minor RC.
    // detectBumpType resolves the actual bump (patch vs minor) at the next release.
    logStep('Advancing to next RC');
    const nextPatch = semver.inc(newVersion, 'patch');
    const nextRc = `${nextPatch}-rc.0`;
    log(`Next RC: ${nextRc}`);
    writePkgVersion(GHOST_CORE_PKG, nextRc);
    writePkgVersion(GHOST_ADMIN_PKG, nextRc);
    run(`git add ${relative(ROOT_DIR, GHOST_CORE_PKG)} ${relative(ROOT_DIR, GHOST_ADMIN_PKG)}`);
    run(`git commit -m "Bumped version to ${nextRc}"`);

    if (opts.dryRun) {
        log('DRY RUN — skipping RC push');
    } else {
        run('git push origin HEAD');
        log('Pushed RC version');
    }

    console.log(`\n✓ Release ${newVersion} complete`);
}

main().catch((err) => {
    console.error(`\n✗ Release failed: ${err.message}`);
    process.exit(1);
});
