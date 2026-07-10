import { page } from "vitest/browser";
import { membersSelectors } from "@tryghost/test-data";

/**
 * Screen helper for the members list: locator factories and multi-step
 * gestures for the acceptance specs. Selector strings come from the
 * `@tryghost/test-data` registry (the same strings the e2e page objects
 * use); assertions stay in the specs.
 */
export const membersScreen = {
    memberRows: () => page.getByTestId(membersSelectors.testIds.listItem),
    link: (name: string) => page.getByRole("link", { name, exact: true }),
    searchInput: () => page.getByLabelText(membersSelectors.names.searchInput),
    noResults: () => page.getByText(membersSelectors.text.noResults),
    showAllButton: () => page.getByRole("button", { name: membersSelectors.names.showAllButton }),

    /** Add a text filter through the filters UI: Filter button → field option → fill the value input. */
    async addFilter(field: keyof typeof membersSelectors.textFilterFields, value: string): Promise<void> {
        await page.getByRole("button", { name: membersSelectors.names.filterButton }).click();
        await page.getByRole("option", { name: field, exact: true }).click();
        await page.getByRole("textbox", { name: membersSelectors.textFilterFields[field] }).fill(value);
    },
};
