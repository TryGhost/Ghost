import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fitColumns, truncate } from '../lib/dev-status-view.ts';
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
});

describe('truncate', () => {
  it('cuts the middle, keeping both ends', () => {
    assert.equal(truncate('dev_lexical_umd_loading_30a7b2', 15), 'dev_lex…_30a7b2');
    assert.equal(truncate('worktree.localhost:2988', 12), 'worktr…:2988');
    assert.equal(truncate('short', 12), 'short');
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
            checks: 'PENDING',
          },
        ],
      ]),
    );
  });
});
