import { page } from "vitest/browser";
import { tagsSelectors } from "@tryghost/test-data";

/** Tags screen locators for acceptance specs; no assertions. */
export const tagsScreen = {
    tagRows: () => page.getByTestId(tagsSelectors.testIds.listRow),
    link: (name: string) => page.getByRole("link", { name, exact: true }),
    publicTab: () => page.getByLabelText(tagsSelectors.names.publicTab),
    internalTab: () => page.getByLabelText(tagsSelectors.names.internalTab),
    emptyStateHeading: () => page.getByRole("heading", { name: tagsSelectors.text.emptyState }),
    createNewTagLink: () => page.getByRole("link", { name: tagsSelectors.names.createNewTagLink }),
};
