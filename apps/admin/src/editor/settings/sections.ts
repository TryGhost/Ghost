/**
 * Every settings section, in the order they are shown. Sections arrive one at a
 * time; an id the sidebar has no entry for renders nothing.
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
  'delete',
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_ORDER)[number];
