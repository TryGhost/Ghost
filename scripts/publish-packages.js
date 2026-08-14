import {parseArgs} from 'node:util';
import {$} from 'execa';
import camelcaseKeys from 'camelcase-keys';

import {ROOT_DIR} from './lib/constants.js';
import {getWorkspace, getPublishablePackages} from './lib/pnpm.js';

/**
 * publish-packages.js — publish the workspace's public packages to npm.
 *
 * Runs in the release (tag) lane and via the packages-only workflow_dispatch.
 * The version of each package is whatever `pnpm version -r` wrote into
 * package.json when the release commit was cut (see scripts/release.js), driven
 * by the changesets in .changeset/. This script does no version computation and
 * no git diffing — it hands the publishable set to `pnpm publish`, which skips
 * any version already on npm, rewrites `workspace:` ranges, and orders the
 * publish by the dependency graph. That makes it idempotent: re-running a tag,
 * or running where nothing was bumped, publishes nothing.
 *
 * The publishable set is the same one `pnpm change check` guards on
 * (getPublishablePackages): non-private packages not listed in
 * pnpm-workspace.yaml `versioning.ignore`. Ghost itself is ignored there and
 * ships via its own tarball job.
 *
 * Usage: node scripts/publish-packages.js [--dry-run] [--package <name>]...
 *
 * --package restricts the run to the named package(s) — the escape hatch for
 * out-of-band publishes.
 */

// Defaults fall back to PUBLISH_* env vars so CI can set them on the job and
// invoke the script bare (a passed CLI flag still wins). PUBLISH_PACKAGE is
// comma-separated to keep the multi-package capability of --package (npm names
// can't contain commas).
const envPackages = (process.env.PUBLISH_PACKAGE || '')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);

const {values} = parseArgs({
    options: {
        'dry-run': {type: 'boolean', default: process.env.PUBLISH_DRY_RUN === 'true'},
        package: {type: 'string', multiple: true, default: envPackages},
    },
});

const {dryRun, package: packageFilter} = camelcaseKeys(values);

const PUBLISH_BRANCH = 'main';

/**
 * Assert the commit being published is on main.
 *
 * This replaces `pnpm publish`'s own branch check, which can't work here: a
 * release tag is checked out in detached HEAD, so pnpm has no current branch to
 * match against publishBranch (GIT_UNKNOWN_BRANCH) and no upstream for its
 * remote-history check. Checking the *commit* rather than the checked-out ref is
 * also strictly stronger — a branch named main proves nothing about ancestry,
 * and it covers the workflow_dispatch path (dispatched from a side branch)
 * identically to the tag path.
 *
 * Uses the compare API rather than `git merge-base --is-ancestor` so the
 * workflow can keep its shallow checkout — ancestry over local history would
 * need fetch-depth: 0 on a repo this size.
 */
async function assertCommitOnPublishBranch() {
    const repository = process.env.GITHUB_REPOSITORY;
    const sha = process.env.GITHUB_SHA;

    if (!repository || !sha) {
        console.log(`Not running in GitHub Actions — skipping the "on ${PUBLISH_BRANCH}" check`);
        return;
    }

    const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // per_page=1 because only the `status` field matters — don't page in the
    // full commit list for a tag that sits well behind the branch tip.
    const url = `https://api.github.com/repos/${repository}/compare/${PUBLISH_BRANCH}...${sha}?per_page=1`;
    const response = await fetch(url, {headers, signal: AbortSignal.timeout(10_000)});

    if (!response.ok) {
        throw new Error(`Could not compare ${sha} against ${PUBLISH_BRANCH}: ${response.status} ${response.statusText}`);
    }

    // Comparing main...<sha>: "identical" means the commit is the branch tip,
    // "behind" means it's an earlier commit on the branch. "ahead"/"diverged"
    // mean it never landed on main.
    const {status} = await response.json();
    if (status !== 'identical' && status !== 'behind') {
        throw new Error(`Refusing to publish: ${sha} is not on ${PUBLISH_BRANCH} (compare status: ${status})`);
    }

    console.log(`${sha.slice(0, 8)} is on ${PUBLISH_BRANCH}`);
}

await assertCommitOnPublishBranch();

const workspace = await getWorkspace();
let packages = await getPublishablePackages(workspace);

if (packageFilter.length > 0) {
    const wanted = new Set(packageFilter);
    const missing = [...wanted].filter(name => !packages.some(p => p.name === name));
    if (missing.length > 0) {
        throw new Error(`Unknown or non-publishable package(s): ${missing.join(', ')}`);
    }
    packages = packages.filter(entry => wanted.has(entry.name));
}

const names = packages.map(p => p.name);
if (names.length === 0) {
    console.log('No publishable packages selected');
    process.exit(0);
}

const pnpm = $({cwd: ROOT_DIR, stdio: 'inherit'});

// `pnpm publish` only tars existing build output, so build the selected packages
// first (mirrors how the Ghost archive builds its component closure before
// packing). Skipped for a dry run, which never packs. `--filter "<name>..."`
// pulls in each package's workspace deps too, and `run build` runs in dependency
// order and skips packages without a build script (e.g. kg-simplemde).
if (!dryRun) {
    const buildFilters = names.flatMap(name => ['--filter', `${name}...`]);
    console.log(`Building ${names.length} package(s) before publish...`);
    await pnpm`pnpm ${buildFilters} run build`;
}

// Publish the exact set (no `...` — the workspace deps pulled in for the build
// aren't necessarily publishable). pnpm skips versions already on npm, rewrites
// `workspace:` ranges to the committed versions, and publishes in graph order.
// --no-git-checks because pnpm's gate can't run against a detached tag checkout
// (see assertCommitOnPublishBranch above, which enforces the part that matters).
// --provenance is explicit, not left to pnpm's auto-detection: on a trusted
// publish pnpm only turns provenance on if it can confirm both the repo and the
// package are public, and any hiccup there (visibility fetch fails, an id token
// it can't read) degrades to a warning and a publish with no attestation.
// Passing the flag makes it a hard requirement instead — it also short-circuits
// the visibility lookup. Needs `id-token: write` and a CI provider sigstore
// recognises, so a local non-dry-run publish will fail here by design.
const publishFilters = names.flatMap(name => ['--filter', name]);
const publishArgs = ['publish', ...publishFilters, '--access', 'public', '--provenance', '--no-git-checks'];
if (dryRun) {
    publishArgs.push('--dry-run');
}
await pnpm`pnpm ${publishArgs}`;
