import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import camelcaseKeys from 'camelcase-keys';

import { findPackagesNeedingChangeset } from './lib/pnpm.js';
import { INTERNAL_DOCS_PATTERN } from './lib/constants.js';

const { values, positionals } = parseArgs({
  options: {
    // mirrors the options pnpm gives for filtering
    'test-pattern': {
      type: 'string',
      multiple: true,
    },
    'changed-files-ignore-pattern': {
      type: 'string',
      multiple: true,
    },
  },
  allowPositionals: true,
});

const { testPattern = [], changedFilesIgnorePattern = [] } = camelcaseKeys(values);
// Positional args win; otherwise fall back to the PR_* env vars the sibling PR
// checks use (check-app-version-bump.js, check-migration-integrity.cjs), so CI
// can invoke this bare. Local runs with neither default to main..HEAD.
// The comparison must be rooted at the PR's fork point, not at a tip of the
// base branch: a tree-diff from the live tip charges the PR with every base
// commit it has not rebased onto yet, while the event payload's PR_BASE_SHA
// freezes at event time and drifts the other way. The merge-base of the base
// ref and the head is right in both cases. Prefer the live base ref (fetched
// by CI just before this runs) for finding it; fall back to the payload SHA.
const liveBase = process.env.PR_BASE_REF && `origin/${process.env.PR_BASE_REF}`;
const [
  requestedBase = liveBase || process.env.PR_BASE_SHA || 'main',
  headCommit = process.env.PR_COMPARE_SHA || process.env.GITHUB_SHA || 'HEAD',
] = positionals;
let baseCommit = requestedBase;
try {
  baseCommit = execFileSync('git', ['merge-base', requestedBase, headCommit || 'HEAD'], {
    encoding: 'utf8',
  }).trim();
} catch {
  // One of the refs is unknown in this checkout; downstream reports it better.
}
// Always applied — the release policy, not a default callers can replace.
const ignorePatterns = [INTERNAL_DOCS_PATTERN, ...testPattern, ...changedFilesIgnorePattern];

const missing = await findPackagesNeedingChangeset(baseCommit, headCommit, ignorePatterns);

if (missing.length > 0) {
  console.error(`The following packages have changes but no changeset:\n${missing.join('\n')}`);
  console.error(`Run "pnpm change" to create a changeset for these packages.`);
  process.exit(1);
}
