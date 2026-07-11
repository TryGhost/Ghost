import { page } from "vitest/browser";
import { getScrollParent } from "@tryghost/shade/utils";
import { tagsSelectors } from "@tryghost/test-data";

/** Tags screen locators and gestures for acceptance specs; no assertions. */
export const tagsScreen = {
    list: () => page.getByTestId(tagsSelectors.testIds.list),
    tagRows: () => page.getByTestId(tagsSelectors.testIds.listRow),
    link: (name: string) => page.getByRole("link", { name, exact: true }),
    publicTab: () => page.getByLabelText(tagsSelectors.names.publicTab),
    internalTab: () => page.getByLabelText(tagsSelectors.names.internalTab),
    // exact: "New tag" is a substring of the empty state's "Create a new tag".
    newTagLink: () => page.getByRole("link", { name: tagsSelectors.names.newTagLink, exact: true }),
    emptyStateHeading: () => page.getByRole("heading", { name: tagsSelectors.text.emptyState }),
    createNewTagLink: () => page.getByRole("link", { name: tagsSelectors.names.createNewTagLink }),

    /** Scroll the list's scroll container to its end — same resolution the virtualizer uses. */
    scrollListToEnd(): void {
        const scroller = getScrollParent(tagsScreen.list().element());
        scroller?.scrollTo({ top: scroller.scrollHeight });
    },
};
