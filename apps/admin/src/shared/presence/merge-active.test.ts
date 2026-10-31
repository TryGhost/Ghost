import { describe, expect, it } from 'vitest';
import { ACTIVE_WINDOW_MS, mergeActive } from './merge-active';
import type { ActivePresence } from './presence-api';

const POST_A = 'a'.repeat(24);
const POST_B = 'b'.repeat(24);
const entry = (resourceId: string, ts: number): ActivePresence => ({
  userId: 'u'.repeat(24),
  resourceId,
  resourceType: 'post',
  ts,
});

describe('mergeActive', () => {
  it('converts server timestamps to local expiry times', () => {
    const live = mergeActive(
      [],
      { active: [entry(POST_A, 5_000)], serverTime: 10_000 },
      [{ id: POST_A, type: 'post' }],
      100_000,
    );
    expect(live).toEqual([{ entry: entry(POST_A, 5_000), expiresAt: 95_000 + ACTIVE_WINDOW_MS }]);
  });

  it('replaces entries for requested resources and keeps unexpired ones for the rest', () => {
    const previous = [
      { entry: entry(POST_A, 0), expiresAt: 50_000 },
      { entry: entry(POST_B, 0), expiresAt: 50_000 },
      { entry: entry('c'.repeat(24), 0), expiresAt: 1_000 },
    ];
    const live = mergeActive(
      previous,
      { active: [], serverTime: 20_000 },
      [{ id: POST_A, type: 'post' }],
      20_000,
    );
    expect(live.map(({ entry: { resourceId } }) => resourceId)).toEqual([POST_B]);
  });
});
