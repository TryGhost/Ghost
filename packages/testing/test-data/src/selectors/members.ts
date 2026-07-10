/**
 * Selector strings for the admin members screen, shared by every test tier.
 *
 * Source of truth is the component source (apps/admin/src/members). The e2e
 * page objects (e2e/helpers/pages/admin/members) and the admin screen helpers
 * (apps/admin/src/members/members.screen.ts) both consume this registry —
 * strings only: no locators, no runner imports.
 */
export const membersSelectors = {
    testIds: {
        listItem: "members-list-item",
        searchInput: "members-search-input",
        actionsButton: "members-actions"
    },
    /** Accessible names (aria-labels / visible control text). */
    names: {
        searchInput: "Search members",
        filterButton: "Filter",
        addFilterButton: "Add filter",
        clearFiltersButton: "Clear",
        newMemberLink: "New member",
        showAllButton: "Show all members",
        addYourselfButton: "Add yourself as a member",
        importCsvLink: "Import with CSV"
    },
    text: {
        emptyState: "Start building your audience",
        noResults: "No matching members found."
    },
    /** Text fields in the add-filter popover: option label → value-input placeholder. */
    textFilterFields: {
        Name: "Enter name...",
        Email: "Enter email..."
    }
} as const;
