import { mintSlug, numberedSlugs, type Numbering, withRoomForNumber } from '../../lib/slug';
import { MAX_SLUG_LENGTH, readsBackInFilter, type SegmentSlug } from './models';

// A segment's slug is minted from its name when the segment is added, as a custom field's key is
// minted from the field's name, with a hyphen between its words where a key has an underscore.
// Where two names mint the same slug, the second segment's slug gets `-2`, the third's `-3`, and
// so on. The slug minting module gives slugs in the format, so a slug is held here only to the
// segments' own rule: a filter reads it back as itself.

/** What a slug's base is minted from when the name mints nothing a filter can name. */
const FALLBACK = 'segment';

/**
 * A minted base leaves room for `-<n>`, with n up to the highest number, so that even the longest
 * minted slug fits the column.
 */
const NUMBERING: Numbering<'-'> = { separator: '-', maxLength: MAX_SLUG_LENGTH, lastNumber: 1000 };

/** `slug` cut to leave room for a number, when a filter reads that back as itself. */
function readableBase(slug: SegmentSlug | undefined): SegmentSlug | undefined {
  const base = slug === undefined ? undefined : withRoomForNumber(slug, NUMBERING);
  return base !== undefined && readsBackInFilter(base) ? base : undefined;
}

/**
 * The base of the slugs minted from `name`: what the name mints, when a filter reads it back;
 * `segment-` followed by what the name mints, when the filter parser reads that as something
 * else, such as `2024` or `null`; and `segment` when the name mints nothing, such as a name of
 * emoji. Undefined only if even `segment` weren't one a filter can name.
 */
function slugBase(name: string): SegmentSlug | undefined {
  const minted = mintSlug(name, '-');
  if (minted === undefined) {
    return readableBase(mintSlug(FALLBACK, '-'));
  }
  return (
    readableBase(minted) ??
    readableBase(mintSlug(`${FALLBACK} ${minted}`, '-')) ??
    readableBase(mintSlug(FALLBACK, '-'))
  );
}

/**
 * The slugs a segment named `name` can be given, in order, leaving out those in `taken`: the base
 * minted from the name, then the base with `-2`, `-3` and so on, each one a filter reads back.
 * Each is made when it is asked for, and `taken` is read then.
 */
export function* slugsForName(name: string, taken: ReadonlySet<string>): Generator<SegmentSlug> {
  const base = slugBase(name);
  if (base === undefined) {
    return;
  }
  for (const slug of numberedSlugs(base, NUMBERING)) {
    if (!taken.has(slug) && readsBackInFilter(slug)) {
      yield slug;
    }
  }
}
