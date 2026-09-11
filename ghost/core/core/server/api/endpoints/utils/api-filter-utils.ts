import errors from '@tryghost/errors';
import { getUsedKeys, rejectStatements } from '@tryghost/mongo-utils';

const schema = require('../../../data/schema').tables;

// Never filterable or orderable through the Content API, on any resource or relation.
const CONTENT_API_RESTRICTED_FIELDS = new Set([
  'password',
  'email',
  'email_only',
  'html',
  'lexical',
  'locale',
  'mobiledoc',
  'newsletter_id',
  'plaintext',
  'email_recipient_filter',
  'published_by',
]);

const CONTENT_API_RESTRICTED_RELATIONS = new Set(['mobiledoc_revisions', 'post_revisions']);

const CONTENT_API_PAGE_RESTRICTED_FIELDS = new Set(['email_subject']);
const CONTENT_API_POST_RESTRICTED_FIELDS = new Set(['show_title_and_feature_image']);

const CONTENT_API_NEWSLETTER_FIELDS = new Set([
  'id',
  'uuid',
  'name',
  'description',
  'slug',
  'sender_email',
  'subscribe_on_signup',
  'visibility',
  'sort_order',
  'created_at',
  'updated_at',
]);

// User fields and relations the Content API does not expose: blocked as bare fields on authors and via author relations elsewhere.
// Not blocked as bare fields on other resources, where visibility/status are legitimate filters.
const CONTENT_API_USER_RESTRICTED_FIELDS = new Set([
  'status',
  'last_seen',
  'created_at',
  'updated_at',
  'roles',
  'roles_users',
  'visibility',
  'locale',
  'accessibility',
  'paid_subscription_started_notification',
  'paid_subscription_canceled_notification',
  'tour',
  'comment_notifications',
  'recommendation_notifications',
  'gift_subscription_notifications',
  'mention_notifications',
  'donation_notifications',
  'milestone_notifications',
  'free_member_signup_notification',
]);

const CONTENT_API_AUTHOR_RELATIONS = new Set(['author', 'authors', 'primary_author']);
const CONTENT_API_TAG_RESTRICTED_FIELDS = new Set([
  'created_at',
  'updated_at',
  'parent_id',
  'parent',
]);
const CONTENT_API_TAG_RELATIONS = new Set(['tag', 'tags', 'primary_tag']);

const ADMIN_API_RESTRICTED_FIELDS = new Set(['password']);

function getOrderAttributes(tableName: string): string[] {
  return Object.keys(schema[tableName])
    .map((field) => `${tableName}.${field}`)
    .filter((field) => !field.includes('@@'));
}

const CONTENT_API_AUTHOR_ORDER_ATTRIBUTES = getOrderAttributes('users');
const CONTENT_API_TAG_ORDER_ATTRIBUTES = getOrderAttributes('tags');
const CONTENT_API_NEWSLETTER_ORDER_ATTRIBUTES = getOrderAttributes('newsletters');
const CONTENT_API_POST_ORDER_ATTRIBUTES = [
  ...getOrderAttributes('posts'),
  ...getOrderAttributes('posts_meta').filter(
    (field) => !['posts_meta.id', 'posts_meta.post_id'].includes(field),
  ),
];

function hasRestrictedSegment(key: string, fields: Set<string>): boolean {
  return key
    .toLowerCase()
    .split('.')
    .some((segment) => fields.has(segment));
}

function hasRestrictedUserSegment(key: string): boolean {
  const segments = key.toLowerCase().split('.');
  return segments.some(
    (segment, index) =>
      index > 0 &&
      CONTENT_API_AUTHOR_RELATIONS.has(segments[index - 1]) &&
      CONTENT_API_USER_RESTRICTED_FIELDS.has(segment),
  );
}

function hasRestrictedTagSegment(key: string): boolean {
  const segments = key.toLowerCase().split('.');
  return segments.some(
    (segment, index) =>
      index > 0 &&
      CONTENT_API_TAG_RELATIONS.has(segments[index - 1]) &&
      CONTENT_API_TAG_RESTRICTED_FIELDS.has(segment),
  );
}

function isContentApiRestrictedKey(key: string): boolean {
  return (
    hasRestrictedSegment(key, CONTENT_API_RESTRICTED_FIELDS) ||
    hasRestrictedSegment(key, CONTENT_API_RESTRICTED_RELATIONS) ||
    hasRestrictedUserSegment(key) ||
    hasRestrictedTagSegment(key)
  );
}

function isAuthorsContentApiRestrictedKey(key: string): boolean {
  return (
    isContentApiRestrictedKey(key) || hasRestrictedSegment(key, CONTENT_API_USER_RESTRICTED_FIELDS)
  );
}

function isTagsContentApiRestrictedKey(key: string): boolean {
  return (
    isContentApiRestrictedKey(key) || hasRestrictedSegment(key, CONTENT_API_TAG_RESTRICTED_FIELDS)
  );
}

function isPostsContentApiRestrictedKey(key: string): boolean {
  return (
    isContentApiRestrictedKey(key) || hasRestrictedSegment(key, CONTENT_API_POST_RESTRICTED_FIELDS)
  );
}

function isPagesContentApiRestrictedKey(key: string): boolean {
  return (
    isContentApiRestrictedKey(key) || hasRestrictedSegment(key, CONTENT_API_PAGE_RESTRICTED_FIELDS)
  );
}

function isNewslettersContentApiRestrictedKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  const fieldKey = normalizedKey.startsWith('newsletters.')
    ? normalizedKey.slice('newsletters.'.length)
    : normalizedKey;
  return !CONTENT_API_NEWSLETTER_FIELDS.has(fieldKey);
}

function rejectRestrictedOrderFields(
  order: string | string[] | undefined,
  orderAttributes: string[],
  isRestricted: (field: string) => boolean,
): string | undefined {
  if (!order) {
    return order;
  }

  const allowedClauses = (Array.isArray(order) ? order : [order])
    .flatMap((value) => value.split(','))
    .map((clause) => clause.trim())
    .filter(Boolean)
    .filter((clause) => {
      const [field] = clause.split(/\s+/);
      const normalizedField = field.toLowerCase();
      const resolvedField =
        orderAttributes.find((orderAttribute) => orderAttribute.endsWith(normalizedField)) ||
        normalizedField;
      return !isRestricted(resolvedField);
    });

  return allowedClauses.length ? allowedClauses.join(',') : undefined;
}

export const rejectContentApiRestrictedFieldsTransformer = (input: unknown) => {
  return rejectStatements(input, isContentApiRestrictedKey);
};

export const rejectAuthorsContentApiRestrictedFieldsTransformer = (input: unknown) => {
  return rejectStatements(input, isAuthorsContentApiRestrictedKey);
};

export const rejectTagsContentApiRestrictedFieldsTransformer = (input: unknown) => {
  return rejectStatements(input, isTagsContentApiRestrictedKey);
};

export const rejectPostsContentApiRestrictedFieldsTransformer = (input: unknown) => {
  return rejectStatements(input, isPostsContentApiRestrictedKey);
};

export const rejectPagesContentApiRestrictedFieldsTransformer = (input: unknown) => {
  return rejectStatements(input, isPagesContentApiRestrictedKey);
};

export const rejectNewslettersContentApiRestrictedFieldsTransformer = (input: unknown) => {
  return rejectStatements(input, isNewslettersContentApiRestrictedKey);
};

export const rejectAdminApiRestrictedFieldsTransformer = (input: unknown) => {
  return rejectStatements(input, (key: string) =>
    hasRestrictedSegment(key, ADMIN_API_RESTRICTED_FIELDS),
  );
};

export const validateAdminApiBulkFilterTransformer = (input: unknown) => {
  const restrictedField = getUsedKeys(input).find((key: string) =>
    hasRestrictedSegment(key, ADMIN_API_RESTRICTED_FIELDS),
  );

  if (restrictedField) {
    throw new errors.BadRequestError({
      message: 'Restricted fields cannot be used in bulk operation filters.',
    });
  }

  return input;
};

export function rejectAuthorsRestrictedOrderFields(
  order: string | string[] | undefined,
): string | undefined {
  return rejectRestrictedOrderFields(
    order,
    CONTENT_API_AUTHOR_ORDER_ATTRIBUTES,
    isAuthorsContentApiRestrictedKey,
  );
}

export function rejectTagsRestrictedOrderFields(
  order: string | string[] | undefined,
): string | undefined {
  return rejectRestrictedOrderFields(
    order,
    CONTENT_API_TAG_ORDER_ATTRIBUTES,
    isTagsContentApiRestrictedKey,
  );
}

export function rejectPostsContentApiRestrictedOrderFields(
  order: string | string[] | undefined,
): string | undefined {
  return rejectRestrictedOrderFields(
    order,
    CONTENT_API_POST_ORDER_ATTRIBUTES,
    isPostsContentApiRestrictedKey,
  );
}

export function rejectPagesContentApiRestrictedOrderFields(
  order: string | string[] | undefined,
): string | undefined {
  return rejectRestrictedOrderFields(
    order,
    CONTENT_API_POST_ORDER_ATTRIBUTES,
    isPagesContentApiRestrictedKey,
  );
}

export function rejectNewslettersContentApiRestrictedOrderFields(
  order: string | string[] | undefined,
): string | undefined {
  return rejectRestrictedOrderFields(
    order,
    CONTENT_API_NEWSLETTER_ORDER_ATTRIBUTES,
    isNewslettersContentApiRestrictedKey,
  );
}
