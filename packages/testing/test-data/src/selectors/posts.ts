/**
 * Posts/pages list selector strings, consumed by the admin screen helpers and
 * the e2e page objects. Source of truth: apps/admin/src/posts/list.
 *
 * The testids are shared with the Ember list deliberately — the two
 * implementations can never both be mounted (the Ember route aborts when the
 * React screen serves the URL), so the same vocabulary drives both.
 */

// testids
export const postsList = "posts-list";
export const postsListItem = "posts-list-item";
export const postListItemLink = "post-list-item-link";
export const postListItemAction = "post-list-item-action";
export const postFeaturedMarker = "post-featured";
export const postMetricPanel = "post-metric-panel";
export const postsEmptyCold = "posts-empty-cold";
export const postsEmptyFiltered = "posts-empty-filtered";
export const postsFilters = "posts-filters";
export const postsSort = "posts-sort";

/** The React screen root — `posts-page` or `pages-page`. */
export const listPage = (resource: "posts" | "pages"): string => `${resource}-page`;
