import type { PostResource } from './post-resource';

/**
 * The values each filter and the sort can take, ported verbatim from
 * `apps/ember-admin/app/controllers/posts.js` and `controllers/pages.js`.
 *
 * Data only - the Shade field config that renders these (icons, async value
 * sources for author and tag) is built on top in the filters UI.
 */

export interface PostFilterOption {
  value: string;
  label: string;
}

const POST_TYPE_OPTIONS: PostFilterOption[] = [
  { value: 'draft', label: 'Draft posts' },
  { value: 'published', label: 'Published posts' },
  { value: 'sent', label: 'Email only posts' },
  { value: 'scheduled', label: 'Scheduled posts' },
];

/** Pages are never emailed, so they have no "Email only". */
const PAGE_TYPE_OPTIONS: PostFilterOption[] = [
  { value: 'draft', label: 'Draft pages' },
  { value: 'published', label: 'Published pages' },
  { value: 'scheduled', label: 'Scheduled pages' },
];

/** Independent of type: featured is a flag, not a status. */
export const FEATURED_OPTIONS: PostFilterOption[] = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

/**
 * `[paid,tiers]` is an opaque option value, not structure - Ember interpolates
 * it straight into the filter string.
 */
export const VISIBILITY_OPTIONS: PostFilterOption[] = [
  { value: 'public', label: 'Public' },
  { value: 'members', label: 'Members-only' },
  { value: '[paid,tiers]', label: 'Paid members-only' },
];

/** "Newest first" is the absence of an `order` param, so it has no entry. */
export const ORDER_OPTIONS: PostFilterOption[] = [
  { value: 'published_at asc', label: 'Oldest first' },
  { value: 'updated_at desc', label: 'Recently updated' },
];

export const DEFAULT_ORDER_LABEL = 'Newest first';

export function getTypeOptions(resource: PostResource): PostFilterOption[] {
  return resource === 'pages' ? PAGE_TYPE_OPTIONS : POST_TYPE_OPTIONS;
}

export function getOrderLabel(order?: string | null): string {
  if (!order) {
    return DEFAULT_ORDER_LABEL;
  }

  return ORDER_OPTIONS.find((option) => option.value === order)?.label ?? order;
}
