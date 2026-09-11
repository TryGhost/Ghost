/**
 * The params that make up a posts/pages URL, and therefore a saved view's
 * identity. `order` is included: Ember's `reset-query-params` covers all five,
 * and its `activeView` compares all five, so two views differing only by sort
 * are different views.
 *
 * Kept separate from `post-filter-query.ts` (which owns the four *filter*
 * params) so the sidebar can import it without pulling in the chip model.
 */
export const POST_VIEW_PARAMS = ['type', 'visibility', 'author', 'tag', 'order'] as const;

export type PostViewParam = (typeof POST_VIEW_PARAMS)[number];
