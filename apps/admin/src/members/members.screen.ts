import { page } from "vitest/browser";
import {
    addFilterButton,
    filterButton,
    membersListItem,
    noResultsText,
    searchLabel,
    showAllButton,
    textFilterFields,
} from "@tryghost/test-data/selectors/members";

/** Members screen locators and gestures for acceptance specs; no assertions. */
export const membersScreen = {
    memberRows: () => page.getByTestId(membersListItem),
    memberRow: (name: string) => page.getByTestId(membersListItem).filter({ hasText: name }),
    link: (name: string) => page.getByRole("link", { name, exact: true }),
    searchInput: () => page.getByLabelText(searchLabel),
    noResults: () => page.getByText(noResultsText),
    showAllButton: () => page.getByRole("button", { name: showAllButton }),
    emptyState: () => page.getByText("Start building your audience"),
    actionsButton: () => page.getByTestId("members-actions"),
    dialog: () => page.getByRole("dialog"),
    menuItem: (name: string | RegExp) => page.getByRole("menuitem", { name }),

    /** Add a text filter through the filters UI: Filter button → field option → fill the value input. */
    async addFilter(field: keyof typeof textFilterFields, value: string): Promise<void> {
        await membersScreen.openFilterField(field);
        await page.getByRole("textbox", { name: textFilterFields[field] }).fill(value);
    },

    /** Add a searchable multiselect filter: Filter button → field option → search → pick an option. */
    async addSearchableFilter(field: string, searchText: string, optionName: string): Promise<void> {
        await membersScreen.openFilterField(field);
        // The search placeholder derives from the field label.
        await page.getByPlaceholder(`Search ${field.toLowerCase()}...`).fill(searchText);
        await page.getByRole("option", { name: optionName }).click();
    },

    async addMultiselectFilter(field: string, optionNames: string[]): Promise<void> {
        await membersScreen.openFilterField(field);
        await page.getByRole("option", { name: optionNames[0], exact: true }).click();

        if (optionNames.length > 1) {
            await membersScreen.openMultiselectValue(optionNames[0]);
            for (const optionName of optionNames.slice(1)) {
                await membersScreen.multiselectOption(optionName).click();
            }
        }
    },

    multiselectOption: (name: string) => page.getByRole("option", { name: new RegExp(`^${name}\\b`) }),

    async openMultiselectValue(triggerName: string): Promise<void> {
        await page.getByRole("button", { name: triggerName, exact: true }).click();
    },

    async openActionsMenu(): Promise<void> {
        await membersScreen.actionsButton().click();
    },

    async openFilterField(field: string): Promise<void> {
        // The trigger relabels from "Filter" to "Add filter" once a filter exists.
        const buttonName = new RegExp(`^(${filterButton}|${addFilterButton})$`);
        await page.getByRole("button", { name: buttonName }).click();
        await page.getByRole("option", { name: field, exact: true }).click();
    },
};
