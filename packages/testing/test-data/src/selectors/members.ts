/**
 * Members screen selector strings, consumed by the admin screen helpers and
 * the e2e page objects. Source of truth: apps/admin/src/members.
 */

// testids
export const membersListItem = "members-list-item";
export const membersSearchInput = "members-search-input";
export const membersActions = "members-actions";

// accessible names
export const searchLabel = "Search members";
export const filterButton = "Filter";
export const addFilterButton = "Add filter";
export const clearFiltersButton = "Clear";
export const newMemberLink = "New member";
export const showAllButton = "Show all members";
export const addYourselfButton = "Add yourself as a member";
export const importCsvLink = "Import with CSV";

// text fragments
export const emptyStateText = "Start building your audience";
export const noResultsText = "No matching members found.";

/** Text fields in the add-filter popover: option label → value-input placeholder. */
export const textFilterFields = {
    Name: "Enter name...",
    Email: "Enter email..."
} as const;
