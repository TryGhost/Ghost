// Email recipient-filter string handling, consolidated from the Ember admin's
// four copies of the same comma-split logic: `utils/publish-options.js`,
// `components/gh-members-recipient-select.js`,
// `components/editor/modals/publish-flow.js` and
// `services/members-count-cache.js`. Behavior (including quirks) is preserved
// so Ember and React screens classify and rebuild filters identically.

export const FREE_SEGMENT = 'status:free';
export const PAID_SEGMENT = 'status:-free';

/**
 * The canonical "everyone" spelling. Selecting both the free and paid
 * checkboxes produces this filter, and the server treats it as all members.
 */
export const EVERYONE_RECIPIENT_FILTER = `${FREE_SEGMENT},${PAID_SEGMENT}`;

/** Expands the API's legacy segment sentinels into the filters used by Admin. */
export function normalizeRecipientFilter(filter: string | null | undefined): string | null {
  if (filter === 'all') {
    return EVERYONE_RECIPIENT_FILTER;
  }
  if (!filter || filter === 'none') {
    return null;
  }
  return filter;
}

const BASE_SEGMENTS: string[] = [FREE_SEGMENT, PAID_SEGMENT];

export interface RecipientFilterSegments {
  /** Exact `status:free` present among the base segments (the "free members" checkbox). */
  free: boolean;
  /** Exact `status:-free` present among the base segments (the "paid members" checkbox). */
  paid: boolean;
  /**
   * Raw base segments in first-occurrence order. Kept verbatim (untrimmed)
   * because a padded segment like `" status:free"` is classified as a base
   * segment but does not check the free checkbox, and survives a rebuild as-is.
   */
  base: string[];
  /**
   * Raw non-blank segments that are not base segments — `label:<slug>`,
   * `tier:<slug>` and any other custom NQL segments — in first-occurrence order.
   */
  specific: string[];
}

/**
 * Splits a recipient filter into base (free/paid) and specific (label/tier)
 * segments by comma, the way `gh-members-recipient-select` does. This is a
 * plain comma split, not an NQL parse: a specific segment whose value contains
 * a comma is split apart the same way the Ember component splits it.
 */
export function parseRecipientFilter(filter: string | null | undefined): RecipientFilterSegments {
  const items = (filter || '').split(',');
  const base: string[] = [];
  const specific: string[] = [];

  for (const item of items) {
    if (BASE_SEGMENTS.includes(item.trim())) {
      if (!base.includes(item)) {
        base.push(item);
      }
    } else if (item.trim() !== '') {
      if (!specific.includes(item)) {
        specific.push(item);
      }
    }
  }

  return {
    free: base.includes(FREE_SEGMENT),
    paid: base.includes(PAID_SEGMENT),
    base,
    specific,
  };
}

/**
 * Rebuilds a recipient filter string from parsed segments, mirroring
 * `gh-members-recipient-select#updateFilter`: base segments first, then
 * specific segments, deduplicated, joined by comma. Returns `null` for an
 * empty selection (the "no recipients" state).
 *
 * `paidAvailable: false` drops the paid segment, matching the component's
 * behavior when Stripe is not connected.
 */
export function buildRecipientFilter(
  segments: Pick<RecipientFilterSegments, 'base' | 'specific'>,
  { paidAvailable = true }: { paidAvailable?: boolean } = {},
): string | null {
  const selected = new Set([...segments.base, ...segments.specific]);

  if (!paidAvailable) {
    selected.delete(PAID_SEGMENT);
  }

  return Array.from(selected).join(',') || null;
}

export type RecipientType = 'none' | 'all' | 'free' | 'paid' | 'specific';

/**
 * Classifies a recipient filter the way the publish flow does
 * (`editor/modals/publish-flow.js#recipientType`).
 *
 * The "all" case is a substring check, not a segment check, so any filter
 * containing both `status:free` and `status:-free` anywhere classifies as
 * "all" even alongside other segments — e.g. `label:x,status:free,status:-free`.
 */
export function getRecipientType(filter: string | null | undefined): RecipientType {
  if (!filter) {
    return 'none';
  }

  if (filter === FREE_SEGMENT) {
    return 'free';
  }

  if (filter === PAID_SEGMENT) {
    return 'paid';
  }

  if (filter.includes(FREE_SEGMENT) && filter.includes(PAID_SEGMENT)) {
    return 'all';
  }

  return 'specific';
}

/**
 * Derives the filter that scopes members to a newsletter's audience
 * (`models/newsletter.js#recipientFilter`): actively subscribed to the
 * newsletter, email not disabled, and paid-only when the newsletter's
 * visibility is `paid`.
 */
export function getNewsletterRecipientFilter({
  slug,
  visibility,
}: {
  slug: string;
  visibility?: string;
}): string {
  const filter = [`newsletters.slug:${slug}`, 'email_disabled:0'];

  if (visibility === 'paid') {
    filter.push(PAID_SEGMENT);
  }

  return filter.join('+');
}

/**
 * Composes the full filter sent to the email service
 * (`utils/publish-options.js#fullRecipientFilter`): the newsletter's audience
 * filter, optionally AND-ed with the selected recipient filter.
 */
export function getFullRecipientFilter(
  newsletterRecipientFilter: string,
  recipientFilter: string | null | undefined,
): string {
  let filter = newsletterRecipientFilter;

  if (recipientFilter) {
    filter += `+(${recipientFilter})`;
  }

  return filter;
}
