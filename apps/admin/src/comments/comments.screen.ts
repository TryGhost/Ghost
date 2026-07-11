import { page, type Locator } from "vitest/browser";
import { commentsSelectors } from "@tryghost/test-data";

/** Comments screen locators and gestures for acceptance specs; no assertions. */
export const commentsScreen = {
    commentRows: () => page.getByTestId(commentsSelectors.testIds.listRow),
    // A reply row repeats its parent's text in the replied-to snippet, so
    // match rows on their comment body paragraph only.
    commentRow: (text: string) =>
        commentsScreen.commentRows().filter({ has: page.getByRole("paragraph").filter({ hasText: text }) }),
    filterButton: () => page.getByRole("button", { name: commentsSelectors.names.filterButton, exact: true }),
    showAllButton: () => page.getByRole("button", { name: commentsSelectors.names.showAllCommentsButton }),
    repliesMetric: (row: Locator) => row.getByTestId(commentsSelectors.testIds.repliesMetric).first(),
    repliedToLink: (row: Locator) => row.getByTestId(commentsSelectors.testIds.repliedToLink),

    threadSidebar: () => page.getByRole("dialog", { name: commentsSelectors.names.threadSidebar }),
    threadRow: (commentId: string) => page.getByTestId(`${commentsSelectors.testIds.threadRowPrefix}${commentId}`),
    threadRows: () => page.getByTestId(new RegExp(`^${commentsSelectors.testIds.threadRowPrefix}`)),
    loadMoreRepliesButton: () =>
        commentsScreen.threadSidebar().getByRole("button", { name: commentsSelectors.names.loadMoreRepliesButton }),

    async closeThreadSidebar(): Promise<void> {
        await commentsScreen.threadSidebar().getByRole("button", { name: "Close" }).click();
    },
};
