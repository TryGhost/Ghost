import { page, type Locator } from "vitest/browser";
import {
    commentListRow,
    commentThreadRowPrefix,
    commentingDisabledIndicator,
    filterButton,
    loadMoreRepliesButton,
    repliedToLink,
    repliesMetric,
    showAllCommentsButton,
    threadSidebarLabel,
} from "@tryghost/test-data/selectors/comments";

/** A row locator augmented with factories for the row's parts — still a locator for expect.element. */
export type CommentRowScope = Locator & {
    commentingDisabledIndicator(): Locator;
    moreMenuButton(): Locator;
    repliesMetric(): Locator;
    repliedToLink(): Locator;
};

function rowScope(row: Locator): CommentRowScope {
    return Object.assign(row, {
        commentingDisabledIndicator: () => row.getByTestId(commentingDisabledIndicator),
        moreMenuButton: () => row.getByRole("button").last(),
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
        rowScope(commentsScreen.commentRows().filter({ has: page.getByRole("paragraph").filter({ hasText: text }) })),
    filterButton: () => page.getByRole("button", { name: filterButton, exact: true }),
    showAllButton: () => page.getByRole("button", { name: showAllCommentsButton }),
    disableCommentingMenuItem: () => page.getByRole("menuitem", { name: "Disable commenting" }),
    enableCommentingMenuItem: () => page.getByRole("menuitem", { name: "Enable commenting" }),
    disableCommentsDialog: () => page.getByRole("dialog", { name: "Disable comments" }),

    threadSidebar: () => page.getByRole("dialog", { name: threadSidebarLabel }),
    threadRow: (commentId: string) => rowScope(page.getByTestId(`${commentThreadRowPrefix}${commentId}`)),
    threadRows: () => page.getByTestId(new RegExp(`^${commentThreadRowPrefix}`)),
    loadMoreRepliesButton: () =>
        commentsScreen.threadSidebar().getByRole("button", { name: loadMoreRepliesButton }),

    async closeThreadSidebar(): Promise<void> {
        await commentsScreen.threadSidebar().getByRole("button", { name: "Close" }).click();
    },
};
