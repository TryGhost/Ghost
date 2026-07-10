import { page } from "vitest/browser";
import { tagsSelectors } from "@tryghost/test-data";

/**
 * Screen helper for the tags list: locator factories for the acceptance
 * specs. Selector strings come from the `@tryghost/test-data` registry (the
 * same strings the e2e page objects use); assertions stay in the specs.
 */
export const tagsScreen = {
    tagRows: () => page.getByTestId(tagsSelectors.testIds.listRow),
    rowLink: (name: string) => page.getByRole("link", { name, exact: true }),
    publicTab: () => page.getByLabelText(tagsSelectors.names.publicTab),
    internalTab: () => page.getByLabelText(tagsSelectors.names.internalTab),
    emptyStateHeading: () => page.getByRole("heading", { name: tagsSelectors.text.emptyState }),
    createNewTagLink: () => page.getByRole("link", { name: tagsSelectors.names.createNewTagLink }),
};
