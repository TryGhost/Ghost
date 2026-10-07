import isLength from 'validator/es/lib/isLength.js';
import type { EditablePostProjection } from '@/editor/engine/change-tracker';
import { pick } from '@/editor/engine/pick';
import type { PostStatus } from '@/editor/engine/save-engine';
import { tagIdentities } from '@/shared/tags/tag-selection';
import type { EditorCreatePayload } from './write-payload';

/**
 * The projection keys settings and the email subject editor may write. Slug, status and publish
 * time are absent on purpose: the slug machine and the save engine's command
 * target own them, and a field patch would be dropped before the request.
 */
export const SETTINGS_FIELD_KEYS = [
  'tags',
  'authors',
  'custom_excerpt',
  'email_subject',
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

export type EditorSettingsPatch = Partial<
  Omit<EditorSettingsFields, 'show_title_and_feature_image'>
> & {
  show_title_and_feature_image?: boolean;
};

export const TIERS_REQUIRED = 'Please select at least one tier.';

/** Ember's post validator refuses an empty author list (validators/post.js). */
export const AUTHORS_REQUIRED = 'At least one author is required.';

/**
 * What a settings field writes. Tags and authors travel as identity alone; a
 * tier relation travels as the record the field holds, and the API reads its id.
 */
export function identityFor<Key extends SettingsFieldKey>(
  key: Key,
  fields: EditorSettingsFields,
): EditorCreatePayload[Key];
export function identityFor(
  key: SettingsFieldKey,
  fields: EditorSettingsFields,
): EditorCreatePayload[SettingsFieldKey] {
  if (key === 'authors') {
    return fields.authors.map(({ id }) => ({ id }));
  }
  // The field holds the tag records the field displays; the relation is
  // written by identity alone.
  if (key === 'tags') {
    return tagIdentities(fields.tags);
  }
  if (key === 'tiers') {
    return [...fields.tiers];
  }
  // The flag is a page's; a null is a record that carries none, never a write —
  // the patch type admits only a boolean for it.
  if (key === 'show_title_and_feature_image') {
    return fields.show_title_and_feature_image ?? undefined;
  }
  return fields[key];
}

/** The longest values the server accepts for these fields. */
export const TITLE_MAX = 255;
export const EXCERPT_MAX = 300;
export const CODE_INJECTION_MAX = 65535;
export const EMAIL_SUBJECT_MAX = 300;
export const EMAIL_SUBJECT_TOO_LONG = `Email subject cannot be longer than ${EMAIL_SUBJECT_MAX} characters.`;
export const META_TITLE_MAX = 300;
export const META_DESCRIPTION_MAX = 500;
export const OG_TITLE_MAX = 300;
export const OG_DESCRIPTION_MAX = 500;
export const X_TITLE_MAX = 300;
export const X_DESCRIPTION_MAX = 500;

export const TITLE_TOO_LONG = `Title cannot be longer than ${TITLE_MAX} characters.`;
export const EXCERPT_TOO_LONG = `Excerpt cannot be longer than ${EXCERPT_MAX} characters.`;
export const CODE_INJECTION_HEAD_TOO_LONG = `Header code cannot be longer than ${CODE_INJECTION_MAX} characters.`;
export const CODE_INJECTION_FOOT_TOO_LONG = `Footer code cannot be longer than ${CODE_INJECTION_MAX} characters.`;

/** The field names read as the pane's own labels read. */
export const META_TITLE_TOO_LONG = `Meta title cannot be longer than ${META_TITLE_MAX} characters.`;
export const META_DESCRIPTION_TOO_LONG = `Meta description cannot be longer than ${META_DESCRIPTION_MAX} characters.`;
export const OG_TITLE_TOO_LONG = `Facebook title cannot be longer than ${OG_TITLE_MAX} characters.`;
export const OG_DESCRIPTION_TOO_LONG = `Facebook description cannot be longer than ${OG_DESCRIPTION_MAX} characters.`;
export const X_TITLE_TOO_LONG = `X title cannot be longer than ${X_TITLE_MAX} characters.`;
export const X_DESCRIPTION_TOO_LONG = `X description cannot be longer than ${X_DESCRIPTION_MAX} characters.`;

/** Counted as Core's model validator counts: trimmed, and an emoji with its presentation selector once. */
export function titleError(title: string): string | null {
  return isLength(title.trim(), { max: TITLE_MAX }) ? null : TITLE_TOO_LONG;
}

/** `visibility: 'tiers'` with no tiers: the write contract drops the pair. */
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

/** Counted as the API's schema counts: by code point, so a multibyte character counts once. */
export function overLength(value: string | null, max: number): boolean {
  return Array.from(value ?? '').length > max;
}

/** The settings keys the validator reads, and all a prepared save carries for it. */
export const VALIDATED_SETTINGS_FIELD_KEYS = [
  'email_subject',
  'visibility',
  'tiers',
  'custom_excerpt',
  'codeinjection_head',
  'codeinjection_foot',
  'meta_title',
  'meta_description',
  'canonical_url',
  'og_title',
  'og_description',
  'twitter_title',
  'twitter_description',
] as const;

export type ValidatedSettingsFieldKey = (typeof VALIDATED_SETTINGS_FIELD_KEYS)[number];

/** The validator's whole input, so reading an unlisted key does not compile. */
export type ValidatedSettingsFields = Pick<EditorSettingsFields, ValidatedSettingsFieldKey>;

/** The validator's own view of the live document. */
export function validatedFieldsOf(fields: ValidatedSettingsFields): ValidatedSettingsFields {
  return pick(fields, VALIDATED_SETTINGS_FIELD_KEYS);
}

/** The width each text field is held to, and what it says when it is past it. */
const LENGTH_RULES: Record<
  Exclude<ValidatedSettingsFieldKey, 'visibility' | 'tiers' | 'canonical_url'>,
  { max: number; message: string }
> = {
  email_subject: { max: EMAIL_SUBJECT_MAX, message: EMAIL_SUBJECT_TOO_LONG },
  custom_excerpt: { max: EXCERPT_MAX, message: EXCERPT_TOO_LONG },
  codeinjection_head: { max: CODE_INJECTION_MAX, message: CODE_INJECTION_HEAD_TOO_LONG },
  codeinjection_foot: { max: CODE_INJECTION_MAX, message: CODE_INJECTION_FOOT_TOO_LONG },
  meta_title: { max: META_TITLE_MAX, message: META_TITLE_TOO_LONG },
  meta_description: { max: META_DESCRIPTION_MAX, message: META_DESCRIPTION_TOO_LONG },
  og_title: { max: OG_TITLE_MAX, message: OG_TITLE_TOO_LONG },
  og_description: { max: OG_DESCRIPTION_MAX, message: OG_DESCRIPTION_TOO_LONG },
  twitter_title: { max: X_TITLE_MAX, message: X_TITLE_TOO_LONG },
  twitter_description: { max: X_DESCRIPTION_MAX, message: X_DESCRIPTION_TOO_LONG },
};

/** The rule one settings field breaks, worded as the save-time validator words it. */
export function settingsFieldErrorFor(
  key: ValidatedSettingsFieldKey,
  fields: ValidatedSettingsFields,
): string | null {
  // The tier pairing is one rule over two fields, and the tier field carries it.
  if (key === 'visibility') {
    return null;
  }
  if (key === 'tiers') {
    return tiersIncomplete(fields) ? TIERS_REQUIRED : null;
  }
  // Ember's post validator (validators/post.js): unless blank, it starts with `/` or a
  // scheme and holds no whitespace.
  if (key === 'canonical_url') {
    const url = fields.canonical_url ?? '';
    if (!/\S/.test(url)) {
      return null;
    }
    if (/\s/.test(url) || !/^(\/|[a-zA-Z0-9-]+:)/.test(url)) {
      return 'Please enter a valid URL';
    }
    return overLength(url, 2000) ? 'Canonical URL is too long, max 2000 chars' : null;
  }
  const { max, message } = LENGTH_RULES[key];
  return overLength(fields[key], max) ? message : null;
}

/**
 * The first rule the settings fields break, in the post validator's order. A
 * post the server has not created yet is not held to the tier rule
 * (validators/post.js `isNew`); its write leaves the pair out instead.
 */
export function settingsFieldError(
  fields: ValidatedSettingsFields,
  isNew: boolean,
  /** Fields the save leaves for a later one, whose rules wait for it. */
  skip: ReadonlyArray<ValidatedSettingsFieldKey> = [],
): string | null {
  for (const key of VALIDATED_SETTINGS_FIELD_KEYS) {
    if ((isNew && key === 'tiers') || skip.includes(key)) {
      continue;
    }
    const error = settingsFieldErrorFor(key, fields);
    if (error) {
      return error;
    }
  }
  return null;
}
