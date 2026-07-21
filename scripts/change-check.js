import {parseArgs} from 'node:util'
import camelcaseKeys from 'camelcase-keys';

import {findPackagesNeedingChangeset} from './lib/pnpm.js';

const {values, positionals} = parseArgs({
    options: {
        // mirrors the options pnpm gives for filtering
        'test-pattern': {
            type: 'string',
            multiple: true,
        },
        'changed-files-ignore-pattern': {
            type: 'string',
            multiple: true,
        }
    },
    allowPositionals: true,
});

const {testPattern = [], changedFilesIgnorePattern = []} = camelcaseKeys(values);
// Positional args win; otherwise fall back to the PR_* env vars the sibling PR
// checks use (check-app-version-bump.js, check-migration-integrity.cjs), so CI
// can invoke this bare. Local runs with neither default to main..HEAD.
const [
    baseCommit = process.env.PR_BASE_SHA || 'main',
    headCommit = process.env.PR_COMPARE_SHA || process.env.GITHUB_SHA || 'HEAD'
] = positionals;
const ignorePatterns = [...testPattern, ...changedFilesIgnorePattern];

const missing = await findPackagesNeedingChangeset(baseCommit, headCommit, ignorePatterns);

if (missing.length > 0) {
    console.error(`The following packages have changes but no changeset:\n${missing.join('\n')}`);
    console.error(`Run "pnpm change" to create a changeset for these packages.`);
    process.exit(1);
}
