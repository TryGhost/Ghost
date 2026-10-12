import type { InvalidFieldKey } from '@/editor/session/settings-fields';

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

/**
 * The section each field the save validator checks is edited in, for the fields
 * the panel holds. The title and the inline excerpt live on the canvas, and the
 * email subject in the preview.
 */
export const SETTINGS_FIELD_SECTIONS = {
  custom_excerpt: 'excerpt',
  published_at: 'publish-date',
  authors: 'authors',
  visibility: 'access',
  tiers: 'access',
  canonical_url: 'meta-data',
  meta_title: 'meta-data',
  meta_description: 'meta-data',
  og_title: 'facebook-card',
  og_description: 'facebook-card',
  twitter_title: 'x-card',
  twitter_description: 'x-card',
  codeinjection_head: 'code-injection',
  codeinjection_foot: 'code-injection',
} as const satisfies Record<Exclude<InvalidFieldKey, 'title' | 'email_subject'>, SettingsSectionId>;

/** A field the settings panel edits, which the panel can be asked to take the writer to. */
export type SettingsPanelField = keyof typeof SETTINGS_FIELD_SECTIONS;

export function isSettingsPanelField(key: InvalidFieldKey): key is SettingsPanelField {
  return key in SETTINGS_FIELD_SECTIONS;
}
