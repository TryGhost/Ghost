import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { parseArgs as baseParseArgs } from 'node:util';
import semver from 'semver';
import camelcaseKeys from 'camelcase-keys';
import { setTimeout } from 'node:timers/promises';

import { ROOT_DIR } from './lib/constants.js';
import { resolveBaseTag } from './lib/resolve-base-tag.js';
import { readJsonSync, writeJsonSync } from './lib/utils.js';

const GHOST_CORE_PKG = join(ROOT_DIR, 'ghost/core/package.json');
const GHOST_ADMIN_PKG = join(ROOT_DIR, 'apps/ember-admin/package.json');
const CASPER_DIR = join(ROOT_DIR, 'ghost/core/content/themes/casper');
const SOURCE_DIR = join(ROOT_DIR, 'ghost/core/content/themes/source');

// Generous enough to cover a full CI cycle (~15m) plus a retarget onto a newer
// commit after the first run gets cancelled by a merge.
const MAX_WAIT_MS = 60 * 60 * 1000; // 60 minutes
const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

// --- Argument parsing ---

function parseArgs() {
  // Defaults fall back to RELEASE_* env vars so CI can set them on the job and
  // invoke the script bare (a passed CLI flag still wins). Booleans read the
  // literal string "true".
  const env = process.env;
  const { values } = baseParseArgs({
    options: {
      'bump-type': { type: 'string', default: env.RELEASE_BUMP_TYPE || 'auto' },
      branch: { type: 'string', default: env.RELEASE_BRANCH || 'main' },
      'dry-run': { type: 'boolean', default: env.RELEASE_DRY_RUN === 'true' },
      'skip-checks': { type: 'boolean', default: env.RELEASE_SKIP_CHECKS === 'true' },
      // Version and commit the pending package changesets without touching
      // Ghost's version, cutting a tag, or publishing. Publishing is a
      // separate step (the "Publish Packages" workflow_dispatch).
      'packages-only': { type: 'boolean', default: env.RELEASE_PACKAGES_ONLY === 'true' },
    },
  });

  return camelcaseKeys(values);
}

// --- Helpers ---

function run(cmd, opts = {}) {
  const result = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf8', ...opts });
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
    const addedFiles = run(
      `git diff --diff-filter=A --name-only ${baseTag} HEAD -- ${migrationsPath}`,
    );
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
      const featureCommits = commits
        .split('\n')
        .filter((c) => c.includes('✨') || c.includes('🎉') || c.includes(':sparkles:'));
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

// The aggregate gate for the commit. Filtering by name keeps us off page 2 of
// the check-runs list (CI has ~30 checks and grows with every matrix entry);
// the endpoint's default `filter=latest` already collapses re-runs, and the
// sort makes the newest win if it ever returns more than one.
async function fetchRequiredCheck(commit, token) {
  const url = new URL(`https://api.github.com/repos/TryGhost/Ghost/commits/${commit}/check-runs`);
  url.searchParams.set('check_name', REQUIRED_CHECK_NAME);
  url.searchParams.set('per_page', '100');

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const { check_runs: checkRuns } = await response.json();
  return [...checkRuns].sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0] ?? null;
}

function remoteHead(branch) {
  const output = run(`git ls-remote origin refs/heads/${branch}`);
  return output.split(/\s/)[0] || null;
}

// Move the checkout onto `sha`, but only as a fast-forward — anything else
// means the branch was rewritten or we have local commits, and silently
// resetting would drop work.
function fastForwardTo(branch, sha) {
  run(`git fetch origin ${branch}`);
  try {
    run(`git merge-base --is-ancestor HEAD ${sha}`);
  } catch {
    return false;
  }
  run(`git reset --hard ${sha}`);
  return true;
}

// Wait for the required check on the branch head, and return the commit it
// passed on. CI's concurrency group is per-branch with cancel-in-progress, so a
// merge landing mid-wait cancels the run we're watching: the required check
// either never gets created (the job is still queued when the run dies) or
// completes as cancelled/failure off cancelled dependencies. Either way the
// commit's checks will never go green, so we retarget onto the new head — which
// is what the release wanted anyway: the latest passing commit on the branch.
async function waitForChecks(branch, initialSha) {
  let commit = initialSha;
  logStep(`Waiting for CI checks on ${commit.slice(0, 8)}...`);

  const token = process.env.GITHUB_TOKEN || process.env.RELEASE_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN or RELEASE_TOKEN required for check polling');
  }

  const startTime = Date.now();

  while (true) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (Date.now() - startTime >= MAX_WAIT_MS) {
      throw new Error(
        `Timed out waiting for "${REQUIRED_CHECK_NAME}" on ${commit.slice(0, 8)} after ${elapsed}s`,
      );
    }

    const head = remoteHead(branch);
    if (head && head !== commit) {
      if (!fastForwardTo(branch, head)) {
        throw new Error(
          `${branch} moved to ${head.slice(0, 8)}, which is not a descendant of ${commit.slice(0, 8)} — refusing to retarget`,
        );
      }
      log(`Superseded: ${branch} advanced to ${head.slice(0, 8)}, watching its checks instead`);
      commit = head;
      continue;
    }

    const requiredCheck = await fetchRequiredCheck(commit, token);

    if (requiredCheck) {
      if (requiredCheck.status === 'completed') {
        if (requiredCheck.conclusion === 'success') {
          log(`Required check "${REQUIRED_CHECK_NAME}" passed on ${commit.slice(0, 8)}`);
          return commit;
        }
        // The branch head is still this commit, so nothing superseded it
        // — a cancel here was manual or a stuck run, not a merge race.
        if (requiredCheck.conclusion === 'cancelled' || requiredCheck.conclusion === 'stale') {
          throw new Error(
            `Required check "${REQUIRED_CHECK_NAME}" was ${requiredCheck.conclusion} on ${commit.slice(0, 8)} and ${branch} has not moved — re-run CI for that commit, then release again`,
          );
        }
        throw new Error(
          `Required check "${REQUIRED_CHECK_NAME}" failed (${requiredCheck.conclusion})`,
        );
      }
      log(`Required check is ${requiredCheck.status}, waiting...`);
    } else {
      log('Required check not found yet, waiting...');
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
      { cwd: themeDir, encoding: 'utf8', stdio: 'pipe' },
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

// --- Release planning ---

// Everything that reads the checked-out commit to decide what version we're
// cutting. Re-run verbatim if the checkout moves while waiting for CI, since
// the version, base tag and bump all come from the tree.
function planRelease(bumpType) {
  logStep('Reading current version');
  const currentVersion = readPkgVersion(GHOST_CORE_PKG);
  log(`Current version: ${currentVersion}`);

  logStep('Resolving base tag');
  const { tag: baseTag, isPrerelease } = resolveBaseTag(currentVersion, ROOT_DIR);
  if (isPrerelease) {
    log(`Prerelease detected (${currentVersion}), resolved base tag: ${baseTag}`);
  } else {
    log(`Base tag: ${baseTag}`);
  }

  logStep('Detecting bump type');
  const resolvedBumpType = detectBumpType(baseTag, bumpType);
  const newVersion = semver.inc(currentVersion, resolvedBumpType);
  if (!newVersion) {
    console.error(
      `Failed to calculate new version from ${currentVersion} with bump type ${resolvedBumpType}`,
    );
    process.exit(1);
  }
  log(`Bump type: ${resolvedBumpType}`);
  log(`New version: ${newVersion}`);

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

  return newVersion;
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

  // 1. Plan the release from the current checkout
  let newVersion = planRelease(opts.bumpType);

  // 2. Wait for CI checks, retargeting onto the branch head if a merge
  // supersedes (and cancels the CI of) the commit we're waiting on
  if (!opts.skipChecks) {
    const headSha = run('git rev-parse HEAD');
    const releaseSha = await waitForChecks(opts.branch, headSha);

    if (releaseSha !== headSha) {
      logStep(`Re-planning release for ${releaseSha.slice(0, 8)}`);
      newVersion = planRelease(opts.bumpType);
    }
  } else {
    log('Skipping CI checks');
  }

  // 3. Update theme submodules (main branch only)
  if (opts.branch === 'main') {
    logStep('Updating theme submodules');
    run('git submodule update --init');
    updateThemeSubmodule(CASPER_DIR, 'Casper');
    updateThemeSubmodule(SOURCE_DIR, 'Source');
  } else {
    logStep('Skipping theme updates (not main branch)');
  }

  // 4. Bump versions
  logStep(`Bumping version to ${newVersion}`);
  writePkgVersion(GHOST_CORE_PKG, newVersion);
  writePkgVersion(GHOST_ADMIN_PKG, newVersion);

  // 4b. Consume changesets → version the publishable workspace packages
  // (kg-*, packages/*, ...). These changes land in the Ghost release commit
  // below, tying every package version to the Ghost release that carries its
  // content; publishing (scripts/publish-packages.js) reads those off npm.
  logStep('Applying changeset versions to publishable packages');
  applyChangesetVersions();

  // 5. Commit and tag
  // Stage everything: the two Ghost manifests plus whatever `pnpm version -r`
  // touched (package.jsons, workspace-range rewrites, removed changesets,
  // pnpm-lock.yaml). Theme submodule bumps are already committed above.
  run('git add -A');
  run(`git commit -m "v${newVersion}"`);
  run(`git tag v${newVersion}`);
  log(`Created tag v${newVersion}`);

  // 6. Push
  if (opts.dryRun) {
    logStep('DRY RUN — skipping push');
    log(`Would push branch ${opts.branch} and tag v${newVersion}`);
  } else {
    logStep('Pushing');
    run('git push origin HEAD');
    run(`git push origin v${newVersion}`);
    log('Pushed branch and tag');
  }

  // 7. Advance to next RC
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
