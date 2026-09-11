import { parseArgs } from 'node:util';
import camelcaseKeys from 'camelcase-keys';

import { findPackagesNeedingChangeset } from './lib/pnpm.js';
import { resolveBaseCommit, rootAtMergeBase } from './lib/pr-base.js';
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
// freezes at event time and drifts the other way. resolveBaseCommit picks the
// freshest base available and rootAtMergeBase confines the diff to what the
// branch actually changed.
const [
  requestedBase = resolveBaseCommit() || 'main',
  headCommit = process.env.PR_COMPARE_SHA || process.env.GITHUB_SHA || 'HEAD',
] = positionals;
const baseCommit = rootAtMergeBase(requestedBase, headCommit || 'HEAD');
// Always applied — the release policy, not a default callers can replace.
const ignorePatterns = [INTERNAL_DOCS_PATTERN, ...testPattern, ...changedFilesIgnorePattern];

const missing = await findPackagesNeedingChangeset(baseCommit, headCommit, ignorePatterns);

if (missing.length > 0) {
  console.error(`The following packages have changes but no changeset:\n${missing.join('\n')}`);
  console.error(`Run "pnpm change" to create a changeset for these packages.`);
  process.exit(1);
}
