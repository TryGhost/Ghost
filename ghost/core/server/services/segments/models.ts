import { z } from 'zod';
import { maxBytes } from '../../lib/db-types/text';
import { parseFilter } from '../../lib/filters';
import { slugSchema } from '../../lib/slug';

/** What identifies a segment in the API. Callers treat it as opaque. */
export const SegmentId = z.string().brand('SegmentId');
export type SegmentId = z.infer<typeof SegmentId>;

/** The members filter key that names a segment. */
export const SEGMENT_KEY = 'segment';

/** The most characters a segment's slug can have, which is what the table's column holds. */
export const MAX_SLUG_LENGTH = 191;

/**
 * A segment's slug, which a members filter names the segment by, as in `segment:all-paid`: a
 * readable name in words of lowercase letters and digits joined by single hyphens, no longer than
 * the table's column holds. A segment gets the slug the caller that adds it gives, when a filter
 * can name a segment by that slug and no other segment has it, and otherwise one the server mints
 * from its name. The slug doesn't change after that.
 *
 * This reads a hyphen slug, in the format the slug minting module defines, that fits the column:
 * what a stored slug, a slug a request gives and a slug a filter names are held to. A slug the
 * server mints, and a slug a caller gives a new segment, also has to satisfy `readsBackInFilter`.
 */
export const SegmentSlug = z
  .string({ error: 'Slug must be a string' })
  .max(MAX_SLUG_LENGTH, { error: `Slug cannot be longer than ${MAX_SLUG_LENGTH} characters` })
  .pipe(slugSchema('-', 'Slug'));
export type SegmentSlug = z.infer<typeof SegmentSlug>;

/**
 * Whether the filter parser reads `slug` back as itself when a members filter holds it without
 * quotes, as `segment:<slug>`, as it reads a label's slug. The parser reads some text without
 * quotes as something else, such as `2024` as a number, `null` as no value and `now-1d` as a
 * date, so this asks the parser rather than listing them. A slug is checked when it is minted and
 * when a caller gives one to a new segment, not when a stored slug is read: a later change to the
 * parser then can't make a stored segment unreadable.
 */
export function readsBackInFilter(slug: SegmentSlug): boolean {
  try {
    const parsed = parseFilter(`${SEGMENT_KEY}:${slug}`);
    return Object.keys(parsed).length === 1 && parsed[SEGMENT_KEY] === slug;
  } catch {
    return false;
  }
}

/** The most characters a segment's name can have, counted after trimming. */
export const MAX_NAME_LENGTH = 191;

/** A segment's name as a request gives it: trimmed, not empty, and not too long. */
export const SegmentName = z
  .string({ error: 'Name must be a string' })
  .trim()
  .min(1, { error: 'Name cannot be empty' })
  .refine((name) => [...name].length <= MAX_NAME_LENGTH, {
    error: `Name cannot be longer than ${MAX_NAME_LENGTH} characters`,
  })
  .brand('SegmentName');
export type SegmentName = z.infer<typeof SegmentName>;

/** A name as names are compared: ignoring case and surrounding whitespace. */
export const normalizeName = (name: string) => name.trim().toLowerCase();

/** The most bytes a segment's filter can have, which is what the table's text column holds. */
export const MAX_FILTER_BYTES = 65535;

/**
 * The NQL filter that selects a segment's members, as a request gives it and an import reads it:
 * text that isn't empty and fits the column. It isn't checked against the members' fields, so
 * any filter Admin can save is accepted. A filter a segment is saved with also has to satisfy
 * `isParseableFilter`.
 */
export const SegmentFilter = z
  .string({ error: 'Filter must be a string' })
  .min(1, { error: 'Filter cannot be empty' })
  .refine(maxBytes(MAX_FILTER_BYTES), {
    error: `Filter cannot be longer than ${MAX_FILTER_BYTES} bytes`,
  })
  .brand('SegmentFilter');
export type SegmentFilter = z.infer<typeof SegmentFilter>;

/**
 * Whether the filter parser that reads every members filter can read `filter`: whether it is
 * valid NQL. Only its syntax is checked, so a key that is no member field passes. A filter is
 * checked when a segment is saved with it, not when a stored segment is read: a stored filter
 * that fails, such as one saved before the check or one the migration moved from the saved views
 * setting, keeps loading, and fails only when a members query uses it.
 */
export function isParseableFilter(filter: SegmentFilter): boolean {
  try {
    parseFilter(filter);
    return true;
  } catch {
    return false;
  }
}

/** A named filter over members. */
export const Segment = z.object({
  id: SegmentId,
  name: z.string(),
  slug: SegmentSlug,
  filter: z.string(),
});
export type Segment = z.infer<typeof Segment>;
