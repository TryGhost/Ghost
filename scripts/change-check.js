import {isDeepStrictEqual, parseArgs} from 'node:util'
import camelcaseKeys from 'camelcase-keys';

import {pathHasChanges} from './lib/git.js';
import {
    getWorkspace,
    loadWorkspace,
    loadPackage,
    getPublishablePackages,
    getPackagesWithChangset,
    resolvePackageCatalog,
} from './lib/pnpm.js';

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

const wksp = await getWorkspace();
if (!wksp) {
    throw new Error('Could not load workspace manifest');
}

const projects = await getPublishablePackages(wksp);
if (!projects?.length) {
    throw new Error('No publishable packages found in workspace');
}

const baseWksp = await loadWorkspace(baseCommit);

async function packageHasChanges(project) {
    if (await pathHasChanges(project.dir, baseCommit, headCommit, ignorePatterns)) {
        return true;
    }

    const basePkg = await loadPackage(baseCommit, project.pkgPath);
    if (!basePkg) {
        // no base package.json, this is a new package
        return true;
    }

    const resolvedBase = resolvePackageCatalog(baseWksp, basePkg);
    const resolvedHead = resolvePackageCatalog(wksp, project.manifest);
    return !isDeepStrictEqual(resolvedBase, resolvedHead);
}

const changedPackages = await getPackagesWithChangset(baseCommit, headCommit);
const pkgChanges = await Promise.all(projects.map(async (project) => {
    const hasChanges = await packageHasChanges(project);

    return hasChanges && !changedPackages.has(project.name)
        ? project.name
        : null;
}));

const missing = pkgChanges.filter(Boolean);

if (missing.length > 0) {
    console.error(`The following packages have changes but no changeset:\n${missing.join('\n')}`);
    console.error(`Run "pnpm change" to create a changeset for these packages.`);
    process.exit(1);
}
