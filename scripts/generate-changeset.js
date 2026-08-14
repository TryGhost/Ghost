import {parseArgs} from 'node:util';
import {$} from 'execa';

import {ROOT_DIR} from './lib/constants.js';
import {findPackagesNeedingChangeset} from './lib/pnpm.js';

/**
 * generate-changeset.js — auto-create a changeset for publishable packages that
 * a dependency update touched.
 *
 * Wired into Renovate's postUpgradeTasks (.github/renovate.json5): when a bump
 * lands in a koenig/* or packages/* package (directly, or via a catalog entry
 * it references), this writes a changeset so the PR clears the "Check app
 * version bump" gate without a human authoring one.
 *
 * Renovate runs this with its edits applied to the working tree but not yet
 * committed, so detection compares the working tree against the base branch
 * (empty head ref). The changeset lands in .changeset/ and Renovate commits it
 * via the fileFilters in its postUpgradeTasks config.
 *
 * Usage: node scripts/generate-changeset.js [--bump <type>] [--summary <text>]
 */

const {values} = parseArgs({
    options: {
        bump: {type: 'string', default: process.env.CHANGESET_BUMP || 'patch'},
        summary: {type: 'string', default: process.env.CHANGESET_SUMMARY || 'Updated dependencies'},
    },
});
const {bump, summary} = values;

const git = $({cwd: ROOT_DIR});

// Base: the merge-base with the default branch. Renovate branches off main, so
// this is where the branch diverged; comparing the working tree against it
// surfaces exactly the update's changes. CHANGESET_BASE overrides for testing.
async function resolveBase() {
    if (process.env.CHANGESET_BASE) {
        return process.env.CHANGESET_BASE;
    }
    for (const ref of ['origin/main', 'main']) {
        try {
            const {stdout} = await git`git merge-base ${ref} HEAD`;
            return stdout.trim();
        } catch {
            // ref not present in this checkout — try the next
        }
    }
    throw new Error('Could not resolve a base ref (tried origin/main, main)');
}

const base = await resolveBase();

// Empty head → compare against the working tree (Renovate's uncommitted edits).
const packages = await findPackagesNeedingChangeset(base, '', []);

if (packages.length === 0) {
    console.log('No publishable packages need a changeset');
    process.exit(0);
}

console.log(`Writing a ${bump} changeset for: ${packages.join(', ')}`);
await $({cwd: ROOT_DIR, stdio: 'inherit'})`pnpm change --bump ${bump} --summary ${summary} ${packages}`;
