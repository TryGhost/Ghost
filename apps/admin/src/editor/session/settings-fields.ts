import type { EditablePostProjection } from '@/editor/engine/change-tracker';
import type { PostStatus } from '@/editor/engine/save-engine';

/**
 * The projection keys the settings sidebar may write. Slug, status and publish
 * time are absent on purpose: the slug machine and the save engine's command
 * target own them, and a field patch would be dropped before the request.
 */
export const SETTINGS_FIELD_KEYS = [
  'tags',
  'authors',
  'custom_excerpt',
  'featured',
  'visibility',
  'tiers',
  'meta_title',
  'meta_description',
  'canonical_url',
  'custom_template',
  'codeinjection_head',
  'codeinjection_foot',
  'og_image',
  'og_title',
  'og_description',
  'twitter_image',
  'twitter_title',
  'twitter_description',
  'show_title_and_feature_image',
] as const;

export type SettingsFieldKey = (typeof SETTINGS_FIELD_KEYS)[number];

export type EditorSettingsFields = Pick<EditablePostProjection, SettingsFieldKey>;

export type EditorSettingsPatch = Partial<EditorSettingsFields>;

export const TIERS_REQUIRED = 'Please select at least one tier';

/** `visibility: 'tiers'` with no tiers: the write contract drops the visibility. */
export function tiersIncomplete(
  fields: Pick<EditorSettingsFields, 'visibility' | 'tiers'>,
): boolean {
  return fields.visibility === 'tiers' && fields.tiers.length === 0;
}

/** Ember's post validator refuses the same publish time (validators/post.js). */
export const PUBLISHED_AT_MUST_BE_PAST = 'Please choose a past date and time.';

/** A draft's or published post's publish time may not be now or later. */
export function publishedAtInFuture(
  status: PostStatus,
  publishedAt: string | null,
  now: number = Date.now(),
): boolean {
  if (publishedAt === null || (status !== 'draft' && status !== 'published')) {
    return false;
  }
  const time = Date.parse(publishedAt);
  return !Number.isNaN(time) && time >= now;
}
