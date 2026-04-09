#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const {execSync} = require('node:child_process');
const semver = require('semver');
const {resolveBaseTag} = require('./lib/resolve-base-tag');

const ROOT = path.resolve(__dirname, '..');
const GHOST_CORE_PKG = path.join(ROOT, 'ghost/core/package.json');
const GHOST_ADMIN_PKG = path.join(ROOT, 'ghost/admin/package.json');
const CASPER_DIR = path.join(ROOT, 'ghost/core/content/themes/casper');
const SOURCE_DIR = path.join(ROOT, 'ghost/core/content/themes/source');

const MAX_WAIT_MS = 30 * 60 * 1000; // 30 minutes
const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

// --- Argument parsing ---

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        bumpType: 'auto',
        branch: 'main',
        dryRun: false,
        skipChecks: false
    };

    for (const arg of args) {
        if (arg.startsWith('--bump-type=')) {
            opts.bumpType = arg.split('=')[1];
        } else if (arg.startsWith('--branch=')) {
            opts.branch = arg.split('=')[1];
        } else if (arg === '--dry-run') {
            opts.dryRun = true;
        } else if (arg === '--skip-checks') {
            opts.skipChecks = true;
        } else {
            console.error(`Unknown argument: ${arg}`);
            process.exit(1);
        }
    }

    return opts;
}

// --- Helpers ---

function run(cmd, opts = {}) {
    const result = execSync(cmd, {cwd: ROOT, encoding: 'utf8', ...opts});
    return result.trim();
}

function readPkgVersion(pkgPath) {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
}

function writePkgVersion(pkgPath, version) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.version = version;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function log(msg) {
    console.log(`  ${msg}`);
}

function logStep(msg) {
    console.log(`\n▸ ${msg}`);
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

    while (true) { // eslint-disable-line no-constant-condition
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
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
}

// --- Theme submodule updates ---

function updateThemeSubmodule(themeDir, themeName) {
    if (!fs.existsSync(themeDir)) {
        log(`${themeName} not present, skipping`);
        return false;
    }

    const currentPkg = JSON.parse(fs.readFileSync(path.join(themeDir, 'package.json'), 'utf8'));
    const currentVersion = currentPkg.version;

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

    const updatedPkg = JSON.parse(fs.readFileSync(path.join(themeDir, 'package.json'), 'utf8'));
    const newVersion = updatedPkg.version;

    if (semver.gt(newVersion, currentVersion)) {
        log(`${themeName} updated: v${currentVersion} → v${newVersion}`);
        run(`git add -f ${path.relative(ROOT, themeDir)}`);
        run(`git commit -m "🎨 Updated ${themeName} to v${newVersion}"`);
        return true;
    }

    log(`${themeName} already at latest (v${currentVersion})`);
    return false;
}

// --- Main ---

async function main() {
    const opts = parseArgs();

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
    const {tag: baseTag, isPrerelease} = resolveBaseTag(currentVersion, ROOT);
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

    // 8. Commit and tag
    run(`git add ${path.relative(ROOT, GHOST_CORE_PKG)} ${path.relative(ROOT, GHOST_ADMIN_PKG)}`);
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
    logStep('Advancing to next RC');
    const nextMinor = semver.inc(newVersion, 'minor');
    const nextRc = `${nextMinor}-rc.0`;
    log(`Next RC: ${nextRc}`);
    writePkgVersion(GHOST_CORE_PKG, nextRc);
    writePkgVersion(GHOST_ADMIN_PKG, nextRc);
    run(`git add ${path.relative(ROOT, GHOST_CORE_PKG)} ${path.relative(ROOT, GHOST_ADMIN_PKG)}`);
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
