/**
 * The NQL filter describing the current selection.
 *
 * This is what bulk actions send to the server — `DELETE /posts/?filter=…` and
 * `PUT /posts/bulk?filter=…` — so it is the string with the largest blast
 * radius in the whole screen. Ported branch-for-branch from the `filter` getter
 * in `apps/ember-admin/app/components/posts-list/selection-list.js`.
 *
 * The reason it isn't just a list of ids: after Cmd+A the selection is
 * *inverted* — "everything matching the list's filter, except these" — and may
 * cover posts that were never loaded into the browser. Enumerating ids would
 * silently act on only the first few pages.
 */

export interface PostSelection {
  /**
   * While `inverted`, these are the ids the user has taken *out* of the
   * selection rather than put into it.
   */
  selectedIds: Set<string>;
  inverted: boolean;
}

function idList(ids: Set<string>): string {
  return `'${[...ids].join("','")}'`;
}

/**
 * @param allFilter the filter describing the list the user is looking at, which
 * bounds an inverted selection. Empty means an unfiltered list.
 */
export function getPostSelectionFilter(selection: PostSelection, allFilter: string): string {
  const { selectedIds, inverted } = selection;

  if (inverted) {
    if (allFilter) {
      // Parenthesised: `+` binds tighter than the filter's own operators,
      // so without them the subtraction would apply to its last term.
      return selectedIds.size === 0 ? allFilter : `(${allFilter})+id:-[${idList(selectedIds)}]`;
    }

    // No bound and nothing removed: everything. An empty filter is the only
    // way to say that, which is why the branch below can't share it.
    return selectedIds.size === 0 ? '' : `id:-[${idList(selectedIds)}]`;
  }

  // Deliberately not `''` — that would mean "everything" to the server.
  return selectedIds.size === 0 ? 'id:nothing' : `id:[${idList(selectedIds)}]`;
}
