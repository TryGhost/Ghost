import type { EditablePostProjection, PostRelationLike } from '@/editor/engine/change-tracker';
import type { PostStatus } from '@/editor/engine/save-engine';
import { tagIdentities, type TagLike } from '@/shared/tags/tag-selection';

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

/** Ember's post validator refuses an empty author list (validators/post.js). */
export const AUTHORS_REQUIRED = 'At least one author is required.';

/**
 * What a settings field writes. A relation travels as identity alone, so the
 * field can hold the whole record and still send nothing but order.
 */
export function identityFor(key: SettingsFieldKey, value: unknown): unknown {
  if (key === 'authors') {
    return (value as ReadonlyArray<PostRelationLike>).map(({ id }) => ({ id }));
  }
  // The field holds the tag records the field displays; the relation is
  // written by identity alone.
  if (key === 'tags') {
    return tagIdentities(value as ReadonlyArray<TagLike>);
  }
  return value;
}

/** The column widths the schema gives these fields. */
export const META_TITLE_MAX = 300;
export const META_DESCRIPTION_MAX = 500;

export const META_TITLE_TOO_LONG = `Meta Title cannot be longer than ${META_TITLE_MAX} characters.`;
export const META_DESCRIPTION_TOO_LONG = `Meta Description cannot be longer than ${META_DESCRIPTION_MAX} characters.`;

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

/** Counted as symbols, so a multibyte character counts once. */
export function overLength(value: string | null, max: number): boolean {
  return Array.from(value ?? '').length > max;
}

export type ValidatedSettingsFields = Pick<
  EditorSettingsFields,
  'visibility' | 'tiers' | 'meta_title' | 'meta_description'
>;

/** The first rule the settings fields break, in the post validator's order. */
export function settingsFieldError(fields: ValidatedSettingsFields): string | null {
  if (tiersIncomplete(fields)) {
    return TIERS_REQUIRED;
  }
  if (overLength(fields.meta_title, META_TITLE_MAX)) {
    return META_TITLE_TOO_LONG;
  }
  if (overLength(fields.meta_description, META_DESCRIPTION_MAX)) {
    return META_DESCRIPTION_TOO_LONG;
  }
  return null;
}
