/**
 * Members screen selector strings, consumed by the admin screen helpers and
 * the e2e page objects. Source of truth: apps/admin/src/members.
 */

// testids
export const membersListItem = 'members-list-item';
export const membersSearchInput = 'members-search-input';
export const membersActions = 'members-actions';
export const memberDetail = 'member-detail';
export const memberCustomFieldsField = 'member-custom-fields-field';
export const memberCustomFieldEditModal = 'member-custom-field-edit-modal';
export const importCreateCustomField = 'import-create-custom-field';

// accessible names
export const searchLabel = 'Search members';
export const filterButton = 'Filter';
export const addFilterButton = 'Add filter';
export const clearFiltersButton = 'Clear';
export const newMemberLink = 'New member';
export const showAllButton = 'Show all members';
export const addYourselfButton = 'Add yourself as a member';
export const importCsvLink = 'Import with CSV';

// accessible-name prefixes (the import mapping table names controls per CSV column,
// and member detail names its per-field edit buttons)
export const importColumnTogglePrefix = 'Import ';
export const fieldForColumnPrefix = 'Field for ';
export const editFieldButtonPrefix = 'Edit ';

// import modal strings
export const csvDropzoneText = 'select or drop a csv file';
export const searchFieldsPlaceholder = 'Search fields...';
export const addCustomFieldOption = 'Add custom field';

// text fragments
export const emptyStateText = 'Start building your audience';
export const noResultsText = 'No matching members found.';
export const importCompleteText = 'Import complete';
export const importLeaveConfirmationText = 'Leave without importing?';

/** Text fields in the add-filter popover: option label → value-input placeholder. */
export const textFilterFields = {
  Name: 'Enter name...',
  Email: 'Enter email...',
} as const;
