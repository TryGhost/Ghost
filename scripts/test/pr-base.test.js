import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolveBaseCommit, rootAtMergeBase } from '../lib/pr-base.js';

// A throwaway repository rather than the live one: CI checkouts don't reliably
// carry `refs/remotes/origin/*` (a pull_request checkout fetches only the merge
// ref), and fixture commits make the merge-base assertions deterministic.
//
// pr-base.js pins its git calls to the repo root, so the fixture is routed to
// them through GIT_DIR, which git honours over the working directory.
const FIXTURE = mkdtempSync(join(tmpdir(), 'pr-base-fixture-'));

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
};

function fixtureGit(args) {
  return execFileSync('git', args, { cwd: FIXTURE, encoding: 'utf8', env: GIT_ENV }).trim();
}

function commit(message) {
  fixtureGit(['commit', '--allow-empty', '-m', message]);
  return fixtureGit(['rev-parse', 'HEAD']);
}

let forkPoint; // the commit both branches share
let mainTip; // one commit of base-branch drift past the fork point
let featureTip; // one branch commit past the fork point
let featureTree; // what the pre-commit hook passes as head
let orphanTip; // shares no history with anything

before(() => {
  fixtureGit(['init', '--initial-branch', 'main', '.']);
  forkPoint = commit('fork point');
  mainTip = commit('base branch drift');
  fixtureGit(['update-ref', 'refs/remotes/origin/main', mainTip]);
  fixtureGit(['checkout', '-q', '-b', 'feature', forkPoint]);
  featureTip = commit('branch work');
  featureTree = fixtureGit(['rev-parse', 'HEAD^{tree}']);
  fixtureGit(['checkout', '-q', '--orphan', 'disjoint']);
  orphanTip = commit('no shared history');

  process.env.GIT_DIR = join(FIXTURE, '.git');
});

after(() => {
  delete process.env.GIT_DIR;
  rmSync(FIXTURE, { recursive: true, force: true });
});

describe('resolveBaseCommit', () => {
  it('prefers the live tip of the base ref over the payload SHA', () => {
    const resolved = resolveBaseCommit({ PR_BASE_REF: 'main', PR_BASE_SHA: 'stale-sha' });
    assert.strictEqual(resolved, mainTip);
  });

  it('falls back to the payload SHA when the ref was never fetched', () => {
    const resolved = resolveBaseCommit({
      PR_BASE_REF: 'no-such-branch',
      PR_BASE_SHA: forkPoint,
    });
    assert.strictEqual(resolved, forkPoint);
  });

  it('returns the payload SHA alone outside a fetched-ref context', () => {
    assert.strictEqual(resolveBaseCommit({ PR_BASE_SHA: forkPoint }), forkPoint);
    assert.strictEqual(resolveBaseCommit({}), undefined);
  });
});

describe('rootAtMergeBase', () => {
  it('roots a drifted-base comparison at the fork point', () => {
    assert.strictEqual(rootAtMergeBase(mainTip, featureTip), forkPoint);
  });

  it('returns the base untouched for a tree head, as the pre-commit hook passes', () => {
    assert.strictEqual(rootAtMergeBase(mainTip, featureTree), mainTip);
  });

  it('throws a clear error for an unknown ref', () => {
    assert.throws(
      () => rootAtMergeBase('not-a-real-ref', featureTip),
      /Unable to determine merge-base/,
    );
  });

  it('throws a clear error when the histories share no ancestor', () => {
    assert.throws(() => rootAtMergeBase(mainTip, orphanTip), /Unable to determine merge-base/);
  });
});
