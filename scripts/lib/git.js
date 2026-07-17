import {$} from 'execa';

/**
 * Retrieves the contents of a file from a specific commit in a Git repository.
 * @param {string} commitHash - The hash of the commit to retrieve the file from.
 * @param {string} filePath - The path to the file within the repository.
 * @returns {Promise<string>} - A promise that resolves to the contents of the file.
 */
export async function getFileFromCommit(commitHash, filePath) {
    try {
        const {stdout} = await $`git show ${commitHash}:${filePath}`;
        return stdout;
    } catch (error) {
        throw new Error(`Failed to retrieve file from commit: ${error.message}`);
    }
}

/**
 * Gets the files changed between two commits for a specific path, optionally
 * filtered by a prefix.
 *
 * @param {string} path - The path to check for changes.
 * @param {string} baseCommit - The first commit hash to compare.
 * @param {string?} headCommit - The second commit hash to compare, defaults to HEAD if not provided.
 * @param {boolean?} onlyNew - If true, only returns files that are new in the head commit (not present in the base commit).
 */
export async function getChangedFiles(path, baseCommit, headCommit = 'HEAD', onlyNew = false) {
    try {
        const {stdout} = onlyNew
            ? await $`git diff --name-only --diff-filter=A ${baseCommit} ${headCommit} -- ${path}`
            : await $`git diff --name-only ${baseCommit} ${headCommit} -- ${path}`;

        return stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
        throw new Error(`Failed to get changed files: ${error.message}`);
    }
}

/**
 * Checks if a given path has any changes between two commits
 *
 * @param {string} path - The path to check for changes.
 * @param {string} baseCommit - The first commit hash to compare.
 * @param {string} headCommit - The second commit hash to compare.
 *
 * @returns {Promise<boolean>} - A promise that resolves to true if there are changes, false otherwise.
 */
export async function pathHasChanges(path, baseCommit, headCommit) {
    const changedFiles = await getChangedFiles(path, baseCommit, headCommit);
    return changedFiles.length > 0;
}
