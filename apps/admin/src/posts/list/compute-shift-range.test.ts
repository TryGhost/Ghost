import { computeShiftRange } from './compute-shift-range';
import { describe, expect, it } from 'vitest';

/**
 * Shift-click selects everything between the last-clicked row and this one.
 *
 * The composed array is one bucket-ordered list, so a range is a slice between
 * two indexes.
 *
 * The range is **asymmetric**, and that asymmetry is load-bearing: forward
 * excludes the anchor; backward includes it.
 *
 * That looks like an accident, but it is observable: the range is remembered so
 * the next shift-click can undo it. Excluding the anchor going backward leaves
 * it selected after an undo that should have cleared it.
 */

const ids = ['a', 'b', 'c', 'd', 'e'];

describe('computeShiftRange', () => {
  it('covers the rows after the anchor, excluding it', () => {
    expect(computeShiftRange(ids, 'b', 'd')).toEqual(['c', 'd']);
  });

  it('covers the rows before the anchor, including it', () => {
    expect(computeShiftRange(ids, 'd', 'b')).toEqual(['b', 'c', 'd']);
  });

  it('covers a single row when the two are adjacent going forward', () => {
    expect(computeShiftRange(ids, 'b', 'c')).toEqual(['c']);
  });

  it('covers both rows when the two are adjacent going backward', () => {
    expect(computeShiftRange(ids, 'c', 'b')).toEqual(['b', 'c']);
  });

  // Selecting nothing is the conservative reading of an ambiguous gesture.
  it('selects nothing when shift-clicking the anchor itself', () => {
    expect(computeShiftRange(ids, 'c', 'c')).toEqual([]);
  });

  it('spans the whole list from one end to the other', () => {
    expect(computeShiftRange(ids, 'a', 'e')).toEqual(['b', 'c', 'd', 'e']);
  });

  // The composed array is bucket-ordered — scheduled, then drafts, then
  // published — so a range spanning a bucket boundary is just a slice.
  it('spans a bucket boundary without noticing there was one', () => {
    const buckets = ['sched-1', 'sched-2', 'draft-1', 'draft-2', 'pub-1'];

    expect(computeShiftRange(buckets, 'sched-2', 'pub-1')).toEqual(['draft-1', 'draft-2', 'pub-1']);
  });

  it('spans a bucket boundary backwards, taking the anchor with it', () => {
    const buckets = ['sched-1', 'sched-2', 'draft-1', 'draft-2', 'pub-1'];

    expect(computeShiftRange(buckets, 'draft-2', 'sched-2')).toEqual([
      'sched-2',
      'draft-1',
      'draft-2',
    ]);
  });

  // A row can leave the list between clicks — a bulk edit prunes it, or a
  // filter changes. Returning nothing beats throwing or selecting a
  // half-range against a stale index.
  it('is empty when the anchor is no longer in the list', () => {
    expect(computeShiftRange(ids, 'gone', 'c')).toEqual([]);
  });

  it('is empty when the target is no longer in the list', () => {
    expect(computeShiftRange(ids, 'c', 'gone')).toEqual([]);
  });
});
