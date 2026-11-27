/**
 * Comments screen selector strings, consumed by the admin screen helpers and
 * the e2e page objects. Source of truth: clients/admin/src/comments.
 */

// testids
export const commentsPage = 'comments-page';
export const commentsList = 'comments-list';
export const commentListRow = 'comment-list-row';
export const repliesMetric = 'replies-metric';
export const repliedToLink = 'replied-to-link';
export const commentingDisabledIndicator = 'commenting-disabled-indicator';
/** Thread sidebar rows carry the comment id: `comment-thread-row-<id>`. */
export const commentThreadRowPrefix = 'comment-thread-row-';
export const commentsAnalytics = 'comments-analytics';
/** KPI values carry the metric: `comments-analytics-kpi-<comments|commenters|reported>`. */
export const commentsAnalyticsKpiPrefix = 'comments-analytics-kpi-';
export const commentsAnalyticsTopPosts = 'comments-analytics-top-posts';
export const commentsAnalyticsTopCommenters = 'comments-analytics-top-commenters';

// accessible names
export const filterButton = 'Filter';
export const addFilterButton = 'Add filter';
export const showAllCommentsButton = 'Show all comments';
export const threadSidebarLabel = 'Thread';
export const loadMoreRepliesButton = 'Load more replies';
export const analyticsButton = 'Analytics';
export const dateRangeSelect = 'Date range';
export const viewAllButton = 'View all';
export const retryButton = 'Retry';
export const analyticsSheetLabel = 'Comment analytics';
export const topPostsLabel = 'Top posts';
export const topCommentersLabel = 'Top commenters';

// text fragments
export const emptyStateText = 'No comments yet';
export const notFoundText = 'Comment not found';
export const repliedToText = 'Replied to:';
export const analyticsErrorText = "Comment analytics couldn't be loaded";
export const somethingWentWrongText = 'Something went wrong';
