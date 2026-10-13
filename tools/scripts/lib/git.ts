import { $ } from 'execa';

import { ROOT_DIR } from './constants.ts';

/**
 * Gets the files changed between two commits for a specific path, optionally
 * filtered by a prefix.
 *
 * @param path - The path to check for changes.
 * @param baseCommit - The first commit hash to compare.
 * @param headCommit - The second commit hash to compare, defaults to HEAD if not provided.
 * @param onlyNew - If true, only returns files that are new in the head commit (not present in the base commit).
 * @param cwd - The repository to run git in. Defaults to the repo root so
 *   callers can pass repo-relative paths regardless of the process working
 *   directory.
 */
export async function getChangedFiles(
  path: string,
  baseCommit: string,
  headCommit = 'HEAD',
  onlyNew = false,
  cwd = ROOT_DIR,
): Promise<string[]> {
  try {
    // An empty headCommit diffs baseCommit against the working tree (git omits
    // the second ref), which is what the Renovate/pre-commit flows need —
    // they inspect uncommitted changes. A ref (commit/tag/tree) diffs the two.
    const filter = onlyNew ? ['--diff-filter=A'] : [];
    const refs = headCommit ? [baseCommit, headCommit] : [baseCommit];
    const { stdout } = await $({ cwd })`git diff --name-only ${filter} ${refs} -- ${path}`;

    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    throw new Error(`Failed to get changed files: ${(error as Error).message}`);
  }
}
