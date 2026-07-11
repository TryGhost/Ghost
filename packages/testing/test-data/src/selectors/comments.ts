/**
 * Comments screen selector strings, consumed by the admin screen helpers and
 * the e2e page objects. Source of truth: apps/admin/src/comments.
 */
export const commentsSelectors = {
    testIds: {
        page: "comments-page",
        list: "comments-list",
        listRow: "comment-list-row",
        repliesMetric: "replies-metric",
        repliedToLink: "replied-to-link",
        /** Thread sidebar rows carry the comment id: `comment-thread-row-<id>`. */
        threadRowPrefix: "comment-thread-row-"
    },
    names: {
        filterButton: "Filter",
        addFilterButton: "Add filter",
        showAllCommentsButton: "Show all comments",
        threadSidebar: "Thread",
        loadMoreRepliesButton: "Load more replies"
    },
    text: {
        emptyState: "No comments yet",
        notFound: "Comment not found",
        repliedTo: "Replied to:"
    }
} as const;
