import { page } from "vitest/browser";
import { getScrollParent } from "@tryghost/shade/utils";
import {
    createNewTagLink,
    emptyStateText,
    internalTab,
    newTagLink,
    publicTab,
    tagListRow,
    tagsList,
} from "@tryghost/test-data/selectors/tags";

/** Tags screen locators and gestures for acceptance specs; no assertions. */
export const tagsScreen = {
    list: () => page.getByTestId(tagsList),
    tagRows: () => page.getByTestId(tagListRow),
    link: (name: string) => page.getByRole("link", { name, exact: true }),
    publicTab: () => page.getByLabelText(publicTab),
    internalTab: () => page.getByLabelText(internalTab),
    // exact: "New tag" is a substring of the empty state's "Create a new tag".
    newTagLink: () => page.getByRole("link", { name: newTagLink, exact: true }),
    emptyStateHeading: () => page.getByRole("heading", { name: emptyStateText }),
    createNewTagLink: () => page.getByRole("link", { name: createNewTagLink }),

    /** Scroll the list's scroll container to its end — same resolution the virtualizer uses. */
    scrollListToEnd(): void {
        const scroller = getScrollParent(tagsScreen.list().element());
        scroller?.scrollTo({ top: scroller.scrollHeight });
    },
};
