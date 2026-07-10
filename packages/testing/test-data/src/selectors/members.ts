/**
 * Members screen selector strings, consumed by the admin screen helpers and
 * the e2e page objects. Source of truth: apps/admin/src/members.
 */
export const membersSelectors = {
    testIds: {
        listItem: "members-list-item",
        searchInput: "members-search-input",
        actionsButton: "members-actions"
    },
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
