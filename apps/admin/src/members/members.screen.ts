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
        // The button is labelled "Filter" with no filters and "Add filter"
        // once one exists — match both, like the e2e page object.
        const buttonName = new RegExp(`^(${membersSelectors.names.filterButton}|${membersSelectors.names.addFilterButton})$`);
        await page.getByRole("button", { name: buttonName }).click();
        await page.getByRole("option", { name: field, exact: true }).click();
        await page.getByRole("textbox", { name: membersSelectors.textFilterFields[field] }).fill(value);
    },
};
