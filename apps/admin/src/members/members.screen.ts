import { page } from "vitest/browser";
import { membersSelectors } from "@tryghost/test-data";

/** Members screen locators and gestures for acceptance specs; no assertions. */
export const membersScreen = {
    memberRows: () => page.getByTestId(membersSelectors.testIds.listItem),
    link: (name: string) => page.getByRole("link", { name, exact: true }),
    searchInput: () => page.getByLabelText(membersSelectors.names.searchInput),
    noResults: () => page.getByText(membersSelectors.text.noResults),
    showAllButton: () => page.getByRole("button", { name: membersSelectors.names.showAllButton }),

    /** Add a text filter through the filters UI: Filter button → field option → fill the value input. */
    async addFilter(field: keyof typeof membersSelectors.textFilterFields, value: string): Promise<void> {
        await membersScreen.openFilterField(field);
        await page.getByRole("textbox", { name: membersSelectors.textFilterFields[field] }).fill(value);
    },

    /** Add a searchable multiselect filter: Filter button → field option → search → pick an option. */
    async addSearchableFilter(field: string, searchText: string, optionName: string): Promise<void> {
        await membersScreen.openFilterField(field);
        // The search placeholder derives from the field label.
        await page.getByPlaceholder(`Search ${field.toLowerCase()}...`).fill(searchText);
        await page.getByRole("option", { name: optionName }).click();
    },

    async openFilterField(field: string): Promise<void> {
        // The trigger relabels from "Filter" to "Add filter" once a filter exists.
        const buttonName = new RegExp(`^(${membersSelectors.names.filterButton}|${membersSelectors.names.addFilterButton})$`);
        await page.getByRole("button", { name: buttonName }).click();
        await page.getByRole("option", { name: field, exact: true }).click();
    },
};
