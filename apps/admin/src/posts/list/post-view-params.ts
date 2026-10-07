/**
 * The params that make up a posts/pages URL, and therefore a saved view's
 * identity. `order` is included, so two views differing only by sort are
 * different views.
 *
 * Kept separate from `post-filter-query.ts` (which owns the *filter*
 * params) so the sidebar can import it without pulling in the chip model.
 */
export const POST_VIEW_PARAMS = [
  'type',
  'featured',
  'visibility',
  'author',
  'tag',
  'order',
] as const;

export type PostViewParam = (typeof POST_VIEW_PARAMS)[number];
