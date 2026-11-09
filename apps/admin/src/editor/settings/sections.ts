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
  'editor-font',
  'keyboard-shortcuts',
  'editor-help',
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
  og_title: 'meta-data',
  og_description: 'meta-data',
  twitter_title: 'meta-data',
  twitter_description: 'meta-data',
  codeinjection_head: 'code-injection',
  codeinjection_foot: 'code-injection',
} as const satisfies Record<Exclude<InvalidFieldKey, 'title' | 'email_subject'>, SettingsSectionId>;

/** A field the settings panel edits, which the panel can be asked to take the writer to. */
export type SettingsPanelField = keyof typeof SETTINGS_FIELD_SECTIONS;

export function isSettingsPanelField(key: InvalidFieldKey): key is SettingsPanelField {
  return key in SETTINGS_FIELD_SECTIONS;
}

/** The tabs of the Meta data pane: search metadata and the X and Facebook cards. */
export const META_DATA_TABS = ['meta-data', 'x-card', 'facebook-card'] as const;

export type MetaDataTab = (typeof META_DATA_TABS)[number];

export function isMetaDataTab(value: string): value is MetaDataTab {
  return (META_DATA_TABS as readonly string[]).includes(value);
}

/** The tab of Meta data's pane each of its fields is edited under. */
const META_DATA_FIELD_TABS = {
  canonical_url: 'meta-data',
  meta_title: 'meta-data',
  meta_description: 'meta-data',
  og_title: 'facebook-card',
  og_description: 'facebook-card',
  twitter_title: 'x-card',
  twitter_description: 'x-card',
} as const satisfies Partial<Record<SettingsPanelField, MetaDataTab>>;

/** The Meta data tab a field is edited in, or null for a field outside the pane. */
export function metaDataTabFor(field: SettingsPanelField): MetaDataTab | null {
  return field in META_DATA_FIELD_TABS
    ? META_DATA_FIELD_TABS[field as keyof typeof META_DATA_FIELD_TABS]
    : null;
}
