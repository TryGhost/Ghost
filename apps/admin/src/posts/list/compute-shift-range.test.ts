import {computeShiftRange} from './compute-shift-range';
import {describe, expect, it} from 'vitest';

/**
 * Shift-click selects everything between the last-clicked row and this one.
 *
 * In Ember this walks the three infinity models in bucket order as if they were
 * one flat list. Our composed array already *is* that flat list, so the whole
 * thing collapses to a slice between two indexes — which is why it gets its own
 * pure function and its own tests rather than living inside the reducer.
 *
 * Ember's walk is **asymmetric**, and that asymmetry is load-bearing. Going
 * forward it hits the anchor first, flips its `running` flag and `continue`s,
 * so the anchor is skipped. Going backward it hits the *target* first, and
 * there is no `continue` on that branch — so the target is taken, and when the
 * walk later reaches the anchor it lands in the `else` and takes the anchor
 * too. Forward excludes the anchor; backward includes it.
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

    /**
     * A deliberate divergence, and the only one in this file.
     *
     * Ember's loop enters the endpoint branch, flips `running` on and
     * `continue`s — and then never meets a second endpoint to turn it off
     * again. Everything below the clicked row is selected, to the end of every
     * bucket. Shift-clicking the row you are already anchored to therefore
     * means "select to the end of the list" in Ember, which is plainly not
     * what anyone intends and is about to be wired to a bulk delete.
     *
     * Selecting nothing is the conservative reading of an ambiguous gesture.
     */
    it('selects nothing when shift-clicking the anchor itself', () => {
        expect(computeShiftRange(ids, 'c', 'c')).toEqual([]);
    });

    it('spans the whole list from one end to the other', () => {
        expect(computeShiftRange(ids, 'a', 'e')).toEqual(['b', 'c', 'd', 'e']);
    });

    // The composed array is bucket-ordered — scheduled, then drafts, then
    // published — so a range spanning a bucket boundary is just a slice. This
    // is the case the Ember implementation has to walk three models for.
    it('spans a bucket boundary without noticing there was one', () => {
        const buckets = ['sched-1', 'sched-2', 'draft-1', 'draft-2', 'pub-1'];

        expect(computeShiftRange(buckets, 'sched-2', 'pub-1'))
            .toEqual(['draft-1', 'draft-2', 'pub-1']);
    });

    it('spans a bucket boundary backwards, taking the anchor with it', () => {
        const buckets = ['sched-1', 'sched-2', 'draft-1', 'draft-2', 'pub-1'];

        expect(computeShiftRange(buckets, 'draft-2', 'sched-2'))
            .toEqual(['sched-2', 'draft-1', 'draft-2']);
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
