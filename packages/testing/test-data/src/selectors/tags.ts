/**
 * Tags screen selector strings, consumed by the admin screen helpers and the
 * e2e page objects. Source of truth: apps/admin/src/tags.
 */

// testids
export const tagsPage = 'tags-page';
export const tagsList = 'tags-list';
export const tagListRow = 'tag-list-row';
export const tagsHeaderTabs = 'tags-header-tabs';
export const tagDetail = 'tag-detail';
export const tagDetailTitle = 'tag-detail-title';
export const tagDetailInternalBadge = 'tag-detail-internal-badge';
export const tagSlugPreview = 'tag-slug-preview';
export const tagCoreDataCard = 'tag-core-data-card';
export const tagMetadataCard = 'tag-metadata-card';
export const tagCodeInjectionCard = 'tag-code-injection-card';
export const deleteTagModal = 'delete-tag-modal';
export const deleteTagPostsCount = 'delete-tag-posts-count';
export const confirmDeleteTag = 'confirm-delete-tag';

// data-test-link attribute values (legacy Ember-style hooks the e2e pages also use)
export const tagsBackLink = 'tags-back';

// accessible names
export const publicTab = 'Public tags';
export const internalTab = 'Internal tags';
export const newTagLink = 'New tag';
export const createNewTagLink = 'Create a new tag';
export const tagActionsButton = 'Tag actions';
export const viewPostsMenuItem = 'View posts';
export const deleteTagMenuItem = 'Delete tag';
export const nameFieldLabel = 'Name';
export const slugFieldLabel = 'Slug';
export const descriptionFieldLabel = 'Description';
export const accentColorPickerButton = 'Accent color picker';
export const accentColorHexLabel = 'Accent color hex value';
export const uploadTagImageLabel = 'Upload tag image';
export const unsplashTagImageButton = 'Select tag image from Unsplash';
/** Accessible-name prefixes: the full names carry the editors' inline hbs helper hints. */
export const tagHeaderEditorLabel = 'Tag header';
export const tagFooterEditorLabel = 'Tag footer';
export const codeInjectionTriggerLabel = 'Code injection';

// text fragments
export const emptyStateText = 'Start organizing your content';
export const deleteTagConfirmationText = 'Are you sure you want to delete this tag?';
