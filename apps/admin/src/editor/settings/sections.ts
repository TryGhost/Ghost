/** Every settings section, in display order. The sidebar must implement each one. */
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
  'delete',
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_ORDER)[number];
