import { page, type Locator } from "vitest/browser";
import { commentsSelectors } from "@tryghost/test-data";

/** A row locator augmented with factories for the row's parts — still a locator for expect.element. */
export type CommentRowScope = Locator & {
    repliesMetric(): Locator;
    repliedToLink(): Locator;
};

function rowScope(row: Locator): CommentRowScope {
    return Object.assign(row, {
        repliesMetric: () => row.getByTestId(commentsSelectors.testIds.repliesMetric).first(),
        repliedToLink: () => row.getByTestId(commentsSelectors.testIds.repliedToLink),
    });
}

/** Comments screen locators and gestures for acceptance specs; no assertions. */
export const commentsScreen = {
    commentRows: () => page.getByTestId(commentsSelectors.testIds.listRow),
    // A reply row repeats its parent's text in the replied-to snippet, so
    // match rows on their comment body paragraph only.
    commentRow: (text: string) =>
        rowScope(commentsScreen.commentRows().filter({ has: page.getByRole("paragraph").filter({ hasText: text }) })),
    filterButton: () => page.getByRole("button", { name: commentsSelectors.names.filterButton, exact: true }),
    showAllButton: () => page.getByRole("button", { name: commentsSelectors.names.showAllCommentsButton }),

    threadSidebar: () => page.getByRole("dialog", { name: commentsSelectors.names.threadSidebar }),
    threadRow: (commentId: string) => rowScope(page.getByTestId(`${commentsSelectors.testIds.threadRowPrefix}${commentId}`)),
    threadRows: () => page.getByTestId(new RegExp(`^${commentsSelectors.testIds.threadRowPrefix}`)),
    loadMoreRepliesButton: () =>
        commentsScreen.threadSidebar().getByRole("button", { name: commentsSelectors.names.loadMoreRepliesButton }),

    async closeThreadSidebar(): Promise<void> {
        await commentsScreen.threadSidebar().getByRole("button", { name: "Close" }).click();
    },
};
