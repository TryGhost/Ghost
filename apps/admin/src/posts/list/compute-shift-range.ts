/**
 * The rows a shift-click adds to the selection: everything between the anchor
 * (the last row clicked) and the row just clicked.
 *
 * The buckets are composed into one ordered array upstream, so the range is a
 * slice — and a slice can't get the boundary conditions subtly wrong.
 *
 * The range is asymmetric: going forward the anchor is excluded; going
 * backward it is included.
 *
 * That reads like an accident of the loop, but it is observable rather than
 * cosmetic: the range is remembered so the next shift-click can undo it, and
 * an anchor left out of the group survives an undo that should have cleared it.
 */
export function computeShiftRange(
  orderedIds: string[],
  anchorId: string,
  targetId: string,
): string[] {
  const anchor = orderedIds.indexOf(anchorId);
  const target = orderedIds.indexOf(targetId);

  // Either row can have left the list since it was clicked — pruned by a bulk
  // edit, or filtered away. A stale index would select an arbitrary range.
  if (anchor === -1 || target === -1) {
    return [];
  }

  if (target === anchor) {
    // An ambiguous gesture selects nothing: the range can feed a bulk delete.
    return [];
  }

  return target > anchor
    ? orderedIds.slice(anchor + 1, target + 1)
    : orderedIds.slice(target, anchor + 1);
}
