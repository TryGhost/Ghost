import { execFileSync } from 'node:child_process';

import { ROOT_DIR } from './constants.js';

// Stays in sync with lib/git.js: git always runs from the repo root, and a
// child's stderr never leaks into the caller's output — the pre-commit hook
// runs these checks on every commit.
function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/**
 * The base commit a PR check should compare against.
 *
 * `pull_request.base.sha` freezes into the event payload when the event fires
 * and goes stale as the base branch moves on, while the live tip of the base
 * ref is fetched by CI immediately before these checks run. Prefer the live
 * ref; fall back to the payload SHA when the ref was never fetched into this
 * checkout.
 *
 * @param {object} [env=process.env] - Source of PR_BASE_REF / PR_BASE_SHA.
 * @returns {string|undefined} - A commit SHA, or undefined outside PR context.
 */
export function resolveBaseCommit(env = process.env) {
  if (env.PR_BASE_REF) {
    try {
      return git(['rev-parse', '--verify', `origin/${env.PR_BASE_REF}^{commit}`]);
    } catch {
      // The ref was not fetched in this checkout; the payload SHA still works.
    }
  }
  return env.PR_BASE_SHA;
}

/**
 * The merge-base of `base` and `head`, so a comparison rooted at the result
 * only ever contains the branch's own changes, never the base branch's drift.
 *
 * `head` may be a tree rather than a commit — the pre-commit hook passes `git
 * write-tree` output to compare the staged index. A tree has no ancestry to
 * intersect, so the base is returned as given; the hook already passes the
 * merge-base it computed itself. Any other failure throws: silently falling
 * back to a tip-rooted diff would reintroduce the drift-blaming this exists
 * to prevent.
 *
 * @param {string} base - A commit-ish to root the comparison at.
 * @param {string} head - A commit-ish or tree to compare to.
 * @returns {string} - The merge-base SHA, or `base` for a tree head.
 */
export function rootAtMergeBase(base, head) {
  let headType = null;
  try {
    headType = git(['cat-file', '-t', String(head)]);
  } catch {
    // An unknown head falls through to merge-base for its clearer error.
  }
  if (headType === 'tree') {
    return base;
  }

  try {
    return git(['merge-base', String(base), String(head)]);
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).trim() : '';
    throw new Error(
      `Unable to determine merge-base for ${base} and ${head}. ` +
        `Ensure the base branch history is available in the checkout.` +
        (stderr ? `\n${stderr}` : ''),
    );
  }
}
