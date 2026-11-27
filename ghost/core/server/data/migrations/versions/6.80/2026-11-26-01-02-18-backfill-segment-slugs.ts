import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { parse } from '@tryghost/nql-lang';
import { stripInvisibleChars } from '@tryghost/string';
import unidecode from 'unidecode';
import { z } from 'zod';
import { createTransactionalMigration } from '../../utils';

// Each segment has a readable slug, which the segments service mints from the segment's name
// when the segment is added. This gives each segment a site already has a slug, minted from its
// name as the service mints one when this migration is written. The segments are taken in their
// saved order, so where two names mint the same slug, the segment listed first keeps it and the
// next one gets `-2`, and the result is the same on every run.
//
// The minting is a copy of the service's rather than an import of it, so that a later change to
// how the service mints slugs doesn't change what this migration does on a site that runs it
// later.
//
// A segment that already has a slug keeps it, and its slug counts as taken, so that running the
// migration again on a database it has already run on, as `knex-migrator migrate --force` does,
// changes nothing.

const TABLE = 'segments';

/** The most characters the `slug` column holds. */
const SLUG_LENGTH = 191;

/** The highest number a slug is given to tell it apart from another segment's. */
const LAST_NUMBER = 1000;

/** The base of a slug for a name that mints nothing that can be a slug. */
const FALLBACK = 'segment';

/** Words of lowercase letters and digits, joined by single hyphens. */
const SLUG_FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Whether `candidate` can be a segment's slug: it has the slug's format, fits the column, and the
 * filter parser reads it back as itself when a members filter holds it without quotes, as
 * `segment:<slug>`. The parser reads some text without quotes as something else, such as `2024`
 * as a number, `null` as no value and `now-1d` as a date.
 */
function isSlug(candidate: string): boolean {
  if (candidate.length > SLUG_LENGTH || !SLUG_FORMAT.test(candidate)) {
    return false;
  }
  try {
    return z
      .strictObject({ segment: z.literal(candidate) })
      .safeParse(parse(`segment:${candidate}`)).success;
  } catch {
    return false;
  }
}

/**
 * `name` transliterated to ASCII, without invisible characters, in lowercase, without
 * apostrophes, and with each run of characters other than letters and digits replaced by one
 * hyphen, without a hyphen at either end.
 */
function minted(name: string): string {
  return unidecode(stripInvisibleChars(name))
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `base` cut to leave room for a hyphen and the highest number, without a hyphen at its end. */
function withRoomForNumber(base: string): string {
  return base.slice(0, SLUG_LENGTH - (String(LAST_NUMBER).length + 1)).replace(/-+$/, '');
}

/**
 * The base of the slugs minted from `name`: what the name mints when that can be a slug,
 * `segment-` and it when it can't, and `segment` when the name mints nothing.
 */
function baseOf(name: string): string {
  const base = withRoomForNumber(minted(name));
  if (base === '') {
    return FALLBACK;
  }
  if (isSlug(base)) {
    return base;
  }
  const prefixed = withRoomForNumber(`${FALLBACK}-${base}`);
  return isSlug(prefixed) ? prefixed : FALLBACK;
}

/**
 * The first slug minted from `name` that isn't in `taken`: the base, then the base with `-2`,
 * `-3` and so on. Undefined when every one is taken.
 */
function mintSlug(name: string, taken: ReadonlySet<string>): string | undefined {
  const base = baseOf(name);
  const numbered = Array.from({ length: LAST_NUMBER - 1 }, (_, index) => `${base}-${index + 2}`);
  return [base, ...numbered].find((candidate) => !taken.has(candidate) && isSlug(candidate));
}

/**
 * The slug of the segment with `id` when every slug minted from its name is taken: one minted
 * from `segment` and the id, which no other name mints unless it is that text. When even every
 * one of those is taken, the migration fails, and its transaction leaves the segments as they
 * were, rather than store a slug that isn't one.
 */
function fromId(id: string, taken: ReadonlySet<string>): string {
  const slug = mintSlug(`${FALLBACK} ${id}`, taken);
  if (slug === undefined) {
    throw new errors.InternalServerError({
      message: `Segment ${id} could not be given a slug, as every one minted for it is taken`,
    });
  }
  logging.warn(`Segment ${id} was given the slug ${slug}, as every slug its name mints is taken`);
  return slug;
}

const StoredSegment = z.object({ id: z.string(), name: z.string(), slug: z.string().nullable() });

/**
 * A row of the segments table as this migration reads and writes it. The service's types for the
 * table describe it once every segment has a slug.
 */
type StoredSegment = z.infer<typeof StoredSegment>;

export default createTransactionalMigration(
  async function up(knex) {
    const segments = z.array(StoredSegment).parse(
      await knex<StoredSegment>(TABLE)
        .select('id', 'name', 'slug')
        .orderBy([{ column: 'sort_order' }, { column: 'created_at' }, { column: 'id' }]),
    );
    const unslugged = segments.filter(({ slug }) => slug === null);
    if (unslugged.length === 0) {
      logging.info('Every segment has a slug, so none are minted');
      return;
    }

    const taken = new Set(segments.flatMap(({ slug }) => (slug === null ? [] : [slug])));
    // The loop is over one site's segments, which were its saved member views, and updates each
    // by its primary key.
    // eslint-disable-next-line no-restricted-syntax
    for (const { id, name } of unslugged) {
      const slug = mintSlug(name, taken) ?? fromId(id, taken);
      taken.add(slug);
      await knex<StoredSegment>(TABLE).where({ id }).update({ slug });
    }
    logging.info(`Minted a slug for each of ${unslugged.length} segments`);
  },
  async function down() {
    logging.info('Keeping segment slugs until the column is dropped');
  },
);
