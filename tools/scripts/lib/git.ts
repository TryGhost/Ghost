import { $ as $$ } from 'execa';
import pm from 'picomatch';

import { ROOT_DIR } from './constants.ts';

// Always run git from the repo root so callers can pass repo-relative paths
// regardless of the process working directory.
const $ = $$({ cwd: ROOT_DIR });

// Git prints one of these when the commit is valid but the path isn't in it —
// including the new-file case, where the working tree has the path but the base
// commit doesn't ("exists on disk, but not in"). Both are distinct from an
// invalid commit ("invalid object name") or any other git failure.
const MISSING_PATH_RE = /does not exist in|exists on disk, but not in/;

function isMissingPathError(error: unknown): boolean {
  const { stderr, message } = error as { stderr?: unknown; message?: unknown };
  return MISSING_PATH_RE.test(`${stderr ?? ''}\n${message ?? ''}`);
}

export interface GetFileFromCommitOptions {
  /**
   * When true, resolve to null if the path does not exist in the commit
   * instead of throwing. Invalid commits and other git failures still throw.
   */
  allowMissing?: boolean;
}

/**
 * Retrieves the contents of a file from a specific commit in a Git repository.
 *
 * @param commitHash - The hash of the commit to retrieve the file from.
 * @param filePath - The path to the file within the repository.
 * @returns The file contents, or null when the path is missing and allowMissing
 *   is set.
 */
export async function getFileFromCommit(
  commitHash: string,
  filePath: string,
  { allowMissing = false }: GetFileFromCommitOptions = {},
): Promise<string | null> {
  try {
    const { stdout } = await $`git show ${commitHash}:${filePath}`;
    return stdout;
  } catch (error) {
    if (allowMissing && isMissingPathError(error)) {
      return null;
    }
    throw new Error(`Failed to retrieve file from commit: ${(error as Error).message}`);
  }
}

/**
 * Gets the files changed between two commits for a specific path, optionally
 * filtered by a prefix.
 *
 * @param path - The path to check for changes.
 * @param baseCommit - The first commit hash to compare.
 * @param headCommit - The second commit hash to compare, defaults to HEAD if not provided.
 * @param onlyNew - If true, only returns files that are new in the head commit (not present in the base commit).
 */
export async function getChangedFiles(
  path: string,
  baseCommit: string,
  headCommit = 'HEAD',
  onlyNew = false,
): Promise<string[]> {
  try {
    // An empty headCommit diffs baseCommit against the working tree (git omits
    // the second ref), which is what the Renovate/pre-commit flows need —
    // they inspect uncommitted changes. A ref (commit/tag/tree) diffs the two.
    const filter = onlyNew ? ['--diff-filter=A'] : [];
    const refs = headCommit ? [baseCommit, headCommit] : [baseCommit];
    const { stdout } = await $`git diff --name-only ${filter} ${refs} -- ${path}`;

    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    throw new Error(`Failed to get changed files: ${(error as Error).message}`);
  }
}

/**
 * Builds a matcher for ignore patterns, which are written relative to a
 * directory while git reports repo-relative paths. Matches with `dot: true` so
 * `**` reaches into `.claude`-style directories.
 *
 * @param path - The directory the patterns are relative to.
 * @param ignorePatterns - Patterns relative to `path`.
 * @returns A matcher that is true when a repo-relative path is ignored.
 */
export function buildIgnoreMatcher(
  path: string,
  ignorePatterns: string[],
): (file: string) => boolean {
  return pm(
    ignorePatterns.map((pattern) => `${path}/${pattern}`),
    { dot: true },
  );
}

/**
 * Checks if a given path has any changes between two commits
 *
 * @param path - The path to check for changes.
 * @param baseCommit - The first commit hash to compare.
 * @param headCommit - The second commit hash to compare.
 * @param ignorePatterns - Optional patterns to ignore, relative to `path`. See
 *   {@link buildIgnoreMatcher}.
 * @returns True if there are changes, false otherwise.
 */
export async function pathHasChanges(
  path: string,
  baseCommit: string,
  headCommit: string,
  ignorePatterns: string[] = [],
): Promise<boolean> {
  let changedFiles = await getChangedFiles(path, baseCommit, headCommit);

  if (ignorePatterns.length > 0) {
    const match = buildIgnoreMatcher(path, ignorePatterns);
    changedFiles = changedFiles.filter((file) => !match(file));
  }

  return changedFiles.length > 0;
}
