import { page, type Locator } from 'vitest/browser';
import {
  analyticsButton,
  analyticsErrorText,
  analyticsSheetLabel,
  commentListRow,
  commentsAnalytics,
  commentsAnalyticsKpiPrefix,
  commentsAnalyticsTopCommenters,
  commentsAnalyticsTopPosts,
  commentThreadRowPrefix,
  commentingDisabledIndicator,
  dateRangeSelect,
  filterButton,
  loadMoreRepliesButton,
  repliedToLink,
  repliesMetric,
  retryButton,
  showAllCommentsButton,
  somethingWentWrongText,
  threadSidebarLabel,
  topCommentersLabel,
  topPostsLabel,
  viewAllButton,
} from '@tryghost/test-data/selectors/comments';

/** A row locator augmented with factories for the row's parts — still a locator for expect.element. */
export type CommentRowScope = Locator & {
  commentingDisabledIndicator(): Locator;
  moreMenuButton(): Locator;
  repliesMetric(): Locator;
  repliedToLink(): Locator;
};

/** A top posts/commenters list, with factories for its rows and View all button. */
export type TopListScope = Locator & {
  row(name: string): Locator;
  viewAll(): Locator;
};

function topListScope(list: Locator): TopListScope {
  return Object.assign(list, {
    row: (name: string) => list.getByRole('button', { name }),
    viewAll: () => list.getByRole('button', { name: viewAllButton }),
  });
}

function rowScope(row: Locator): CommentRowScope {
  return Object.assign(row, {
    commentingDisabledIndicator: () => row.getByTestId(commentingDisabledIndicator),
    moreMenuButton: () => row.getByRole('button').last(),
    repliesMetric: () => row.getByTestId(repliesMetric).first(),
    repliedToLink: () => row.getByTestId(repliedToLink),
  });
}

/** Comments screen locators and gestures for acceptance specs; no assertions. */
export const commentsScreen = {
  commentRows: () => page.getByTestId(commentListRow),
  // A reply row repeats its parent's text in the replied-to snippet, so
  // match rows on their comment body paragraph only.
  commentRow: (text: string) =>
    rowScope(
      commentsScreen
        .commentRows()
        .filter({ has: page.getByRole('paragraph').filter({ hasText: text }) }),
    ),
  filterButton: () => page.getByRole('button', { name: filterButton, exact: true }),
  showAllButton: () => page.getByRole('button', { name: showAllCommentsButton }),
  disableCommentingMenuItem: () => page.getByRole('menuitem', { name: 'Disable commenting' }),
  enableCommentingMenuItem: () => page.getByRole('menuitem', { name: 'Enable commenting' }),
  disableCommentsDialog: () => page.getByRole('dialog', { name: 'Disable comments' }),

  threadSidebar: () => page.getByRole('dialog', { name: threadSidebarLabel }),
  threadRow: (commentId: string) =>
    rowScope(page.getByTestId(`${commentThreadRowPrefix}${commentId}`)),
  threadRows: () => page.getByTestId(new RegExp(`^${commentThreadRowPrefix}`)),
  loadMoreRepliesButton: () =>
    commentsScreen.threadSidebar().getByRole('button', { name: loadMoreRepliesButton }),

  analyticsPanel: () => page.getByTestId(commentsAnalytics),
  analyticsButton: () => page.getByRole('button', { name: analyticsButton, exact: true }),
  analyticsSheet: () => page.getByRole('dialog', { name: analyticsSheetLabel }),
  analyticsDateRange: () => page.getByRole('combobox', { name: dateRangeSelect }),
  analyticsDateRangeOption: (name: string) => page.getByRole('option', { name }),
  analyticsKpiValue: (metric: 'comments' | 'commenters' | 'reported') =>
    page.getByTestId(`${commentsAnalyticsKpiPrefix}${metric}`),
  analyticsKpiTrend: (metric: 'comments' | 'commenters' | 'reported') =>
    page.getByTestId(`${commentsAnalyticsKpiPrefix}${metric}-diff`),
  analyticsKpiTab: (label: string) => page.getByRole('tab', { name: label }),
  analyticsTopPosts: () => topListScope(page.getByTestId(commentsAnalyticsTopPosts)),
  analyticsTopCommenters: () => topListScope(page.getByTestId(commentsAnalyticsTopCommenters)),
  analyticsTopPostsSheet: () => topListScope(page.getByRole('dialog', { name: topPostsLabel })),
  analyticsTopCommentersSheet: () =>
    topListScope(page.getByRole('dialog', { name: topCommentersLabel })),
  analyticsError: () => page.getByText(analyticsErrorText),
  analyticsRetryButton: () => page.getByRole('button', { name: retryButton }),
  errorMessage: () => page.getByText(somethingWentWrongText),

  async closeThreadSidebar(): Promise<void> {
    await commentsScreen.threadSidebar().getByRole('button', { name: 'Close' }).click();
  },
};
