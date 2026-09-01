import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';

import { resolveBaseCommit, rootAtMergeBase } from '../lib/pr-base.js';
import { ROOT_DIR } from '../lib/constants.js';

// These run against the live repo, the same way git.test.js does.
function git(args) {
  return execFileSync('git', args, { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
}

const MAIN_TIP = git(['rev-parse', 'origin/main']);
const HEAD_SHA = git(['rev-parse', 'HEAD']);

describe('resolveBaseCommit', () => {
  it('prefers the live tip of the base ref over the payload SHA', () => {
    const resolved = resolveBaseCommit({ PR_BASE_REF: 'main', PR_BASE_SHA: 'stale-sha' });
    assert.strictEqual(resolved, MAIN_TIP);
  });

  it('falls back to the payload SHA when the ref was never fetched', () => {
    const resolved = resolveBaseCommit({
      PR_BASE_REF: 'no-such-branch-zzzzzz',
      PR_BASE_SHA: HEAD_SHA,
    });
    assert.strictEqual(resolved, HEAD_SHA);
  });

  it('returns the payload SHA alone outside a fetched-ref context', () => {
    assert.strictEqual(resolveBaseCommit({ PR_BASE_SHA: HEAD_SHA }), HEAD_SHA);
    assert.strictEqual(resolveBaseCommit({}), undefined);
  });
});

describe('rootAtMergeBase', () => {
  it('roots a commit comparison at the merge-base', () => {
    const expected = git(['merge-base', 'origin/main', 'HEAD']);
    assert.strictEqual(rootAtMergeBase('origin/main', 'HEAD'), expected);
  });

  it('returns the base untouched for a tree head, as the pre-commit hook passes', () => {
    // The commit's own tree stands in for `git write-tree` output.
    const tree = git(['rev-parse', 'HEAD^{tree}']);
    assert.strictEqual(rootAtMergeBase(MAIN_TIP, tree), MAIN_TIP);
  });

  it('throws a clear error when no merge-base can be determined', () => {
    assert.throws(
      () => rootAtMergeBase('not-a-real-ref-zzzzzz', 'HEAD'),
      /Unable to determine merge-base/,
    );
  });
});
