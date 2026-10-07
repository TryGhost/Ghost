/**
 * Posts/pages list selector strings, consumed by the admin screen helpers and
 * the e2e page objects. Source of truth: apps/admin/src/posts/list.
 */

// testids
export const postsList = 'posts-list';
export const postsListItem = 'posts-list-item';
export const postListItemLink = 'post-list-item-link';
export const postListItemAction = 'post-list-item-action';
export const postFeaturedMarker = 'post-featured';
export const postMetricPanel = 'post-metric-panel';
export const postsEmptyCold = 'posts-empty-cold';
export const postsEmptyFiltered = 'posts-empty-filtered';
export const postsFilters = 'posts-filters';
export const postsSort = 'posts-sort';
/** The save/edit-view trigger, in the filter bar or the page header. */
export const managePostView = 'manage-post-view';

/** The React screen root — `posts-page` or `pages-page`. */
export const listPage = (resource: 'posts' | 'pages'): string => `${resource}-page`;
