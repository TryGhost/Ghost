import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fitColumns, truncate, uptime } from '../lib/dev-status-view.ts';
import { parsePullRequests } from '../lib/pull-requests.ts';

describe('fitColumns', () => {
  const columns = [
    { width: 1 },
    { width: 30, min: 12 },
    { width: 7 },
    { width: 40, min: 16 },
    { width: 6, drop: 2 },
    { width: 5, drop: 1 },
  ];

  it('keeps every column that fits', () => {
    assert.deepEqual(fitColumns(columns, 200), [1, 30, 7, 40, 6, 5]);
  });

  it('leaves out the lowest-ranked columns first', () => {
    assert.deepEqual(fitColumns(columns, 95), [1, 30, 7, 40, 6, null]);
  });

  it('then shortens the rightmost shortenable columns down to their minimum', () => {
    assert.deepEqual(fitColumns(columns, 60), [1, 30, 7, 16, null, null]);
    assert.deepEqual(fitColumns(columns, 30), [1, 12, 7, 16, null, null]);
  });

  it("doesn't widen a column that is already narrower than its minimum", () => {
    assert.deepEqual(fitColumns([{ width: 30 }, { width: 5, min: 12 }], 20), [30, 5]);
  });
});

describe('truncate', () => {
  it('cuts the middle, keeping both ends', () => {
    assert.equal(truncate('dev_lexical_umd_loading_30a7b2', 15), 'dev_lex…_30a7b2');
    assert.equal(truncate('worktree.localhost:2988', 12), 'worktr…:2988');
    assert.equal(truncate('short', 12), 'short');
  });
});

describe('uptime', () => {
  it('shows minutes, then hours and minutes, then days and hours', () => {
    assert.equal(uptime(42 * 60_000), '42m');
    assert.equal(uptime((5 * 60 + 7) * 60_000), '5h7m');
    assert.equal(uptime((2 * 24 + 3) * 3_600_000 + 59 * 60_000), '2d3h');
  });
});

describe('parsePullRequests', () => {
  it("maps each branch to its pull request and head commit's checks", () => {
    const pr = {
      number: 31780,
      title: 'Pruned optional peers',
      state: 'OPEN' as const,
      isDraft: true,
      url: 'https://github.com/TryGhost/Ghost/pull/31780',
      headRefOid: 'd145cc89',
      baseRefName: 'main',
      mergeable: 'CONFLICTING' as const,
      isCrossRepository: false,
      commits: { nodes: [{ commit: { statusCheckRollup: { state: 'PENDING' as const } } }] },
    };
    const response = { data: { repository: { b0: { nodes: [] }, b1: { nodes: [pr] } } } };
    assert.deepEqual(
      parsePullRequests(['no-pr', 'with-pr'], response),
      new Map([
        [
          'with-pr',
          {
            number: 31780,
            title: 'Pruned optional peers',
            state: 'OPEN',
            draft: true,
            url: 'https://github.com/TryGhost/Ghost/pull/31780',
            head: 'd145cc89',
            base: 'main',
            conflicts: true,
            crossRepository: false,
            checks: 'PENDING',
          },
        ],
      ]),
    );
  });
});
