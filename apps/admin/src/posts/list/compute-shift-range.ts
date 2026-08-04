/**
 * The rows a shift-click adds to the selection: everything between the anchor
 * (the last row clicked) and the row just clicked.
 *
 * Ember's version (`shiftItem` in `posts-list/selection-list.js`) walks the
 * scheduled, draft and published models in order, flipping a `running` flag as
 * it passes either endpoint. It has to, because it has three arrays. We compose
 * the buckets into one ordered array upstream, so the same rule is a slice —
 * and a slice can't get the boundary conditions subtly wrong.
 *
 * Ember's walk is asymmetric, and faithfully so. Going forward it meets the
 * anchor first, flips `running` on and `continue`s past it — anchor excluded.
 * Going backward it meets the *target* first, where there is no `continue`, so
 * the target is taken and the anchor is later taken by the `else` branch —
 * anchor included.
 *
 * That reads like an accident of the loop, but it is observable rather than
 * cosmetic: the range is remembered so the next shift-click can undo it, and
 * an anchor left out of the group survives an undo that should have cleared it.
 */
export function computeShiftRange(orderedIds: string[], anchorId: string, targetId: string): string[] {
    const anchor = orderedIds.indexOf(anchorId);
    const target = orderedIds.indexOf(targetId);

    // Either row can have left the list since it was clicked — pruned by a bulk
    // edit, or filtered away. A stale index would select an arbitrary range.
    if (anchor === -1 || target === -1) {
        return [];
    }

    if (target === anchor) {
        // Ember flips `running` on here and never meets a second endpoint to
        // turn it off, selecting every row to the end of every bucket. That is
        // a runaway about to be wired to a bulk delete, so this is the one
        // place the port deliberately differs: an ambiguous gesture selects
        // nothing.
        return [];
    }

    return target > anchor
        ? orderedIds.slice(anchor + 1, target + 1)
        : orderedIds.slice(target, anchor + 1);
}
