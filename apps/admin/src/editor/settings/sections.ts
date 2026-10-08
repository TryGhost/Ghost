/**
 * Every section in the panel's scrolling list, in display order. The sidebar
 * must implement each one. Delete is not listed: it sits in the panel's footer.
 */
export const SETTINGS_SECTION_ORDER = [
  'url',
  'publish-date',
  'tags',
  'access',
  'excerpt',
  'authors',
  'template',
  'show-title-and-feature-image',
  'featured',
  'post-history',
  'code-injection',
  'meta-data',
  'x-card',
  'facebook-card',
  'keyboard-shortcuts',
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_ORDER)[number];
