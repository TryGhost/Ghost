import errors from '@tryghost/errors';
import { z } from 'zod';
import { type ParsedFilter, parseFilter } from '../../lib/filters';
import { SEGMENT_KEY, type Segment, SegmentSlug } from './models';

// A members filter names a segment with the `segment` key, whose value is the segment's slug, as
// in `segment:all-paid` or `segment:[all-paid,engaged]`, and leaves one out with
// `segment:-all-paid` or `segment:-[all-paid,engaged]`. Before a members query runs, each `segment`
// statement of the parsed filter is replaced by the segment's own parsed filter, and a left-out
// segment by a `$nor` of it, which matches every member the segment doesn't, including a member
// with no value in a field the segment tests.

/**
 * Reads the segments with any of `slugs`, from the segments table or from a copy of them, such as
 * the one an email will keep of the segments it was sent to.
 */
export type SegmentSource = (slugs: readonly SegmentSlug[]) => Promise<readonly Segment[]>;

type ParsedNode = Record<string, unknown>;

// Only plain objects and arrays are walked. A RegExp or a Date is a value and stays as it is.
function isPlainObject(value: unknown): value is ParsedNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

/** Calls `visit` with the value of every `segment` statement in a parsed filter. */
function eachSegmentStatement(node: unknown, visit: (value: unknown) => void): void {
  if (Array.isArray(node)) {
    node.forEach((child) => eachSegmentStatement(child, visit));
    return;
  }
  if (!isPlainObject(node)) {
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === SEGMENT_KEY) {
      visit(value);
    } else {
      eachSegmentStatement(value, visit);
    }
  }
}

/** Whether a parsed filter names a segment anywhere. */
export function namesSegment(filter: ParsedFilter): boolean {
  let found = false;
  eachSegmentStatement(filter, () => {
    found = true;
  });
  return found;
}

/** Whether `filter` is filter text that names a segment. Text that doesn't parse names none. */
export function filterNamesSegment(filter: string): boolean {
  try {
    return namesSegment(parseFilter(filter));
  } catch {
    return false;
  }
}

const SegmentSlugs = z.array(z.string()).min(1);

/**
 * The slugs a `segment` statement names, and whether a member has to be in any of them, in every
 * one, or in none.
 */
const SegmentStatement = z.union([
  z.string().transform((slug) => ({ slugs: [slug], match: 'any' as const })),
  z
    .strictObject({ $in: SegmentSlugs })
    .transform(({ $in }) => ({ slugs: $in, match: 'any' as const })),
  z
    .strictObject({ $all: SegmentSlugs })
    .transform(({ $all }) => ({ slugs: $all, match: 'every' as const })),
  z
    .strictObject({ $ne: z.string() })
    .transform(({ $ne }) => ({ slugs: [$ne], match: 'none' as const })),
  z
    .strictObject({ $nin: SegmentSlugs })
    .transform(({ $nin }) => ({ slugs: $nin, match: 'none' as const })),
]);

const statementError = () =>
  new errors.BadRequestError({
    message: 'Invalid segment filter.',
    context:
      'A filter names a segment by its slug, as in segment:<slug>, segment:[<slug>,<slug>] for any of several, or segment:[<slug>+<slug>] for all of them, and leaves segments out as in segment:-<slug> or segment:-[<slug>,<slug>].',
    property: 'filter',
  });

const notFoundError = (slugs: readonly string[]) =>
  new errors.ValidationError({
    message: 'Segment not found.',
    context: `No segment has the slug ${slugs.join(', ')}.`,
    property: 'filter',
  });

/**
 * Parses a `segment` statement's value, with its slugs in lowercase as slugs are minted, so a
 * filter names a segment whatever the case it writes the slug in, as MySQL compares a label's
 * slug.
 */
function statementOf(value: unknown) {
  const parsed = SegmentStatement.safeParse(value);
  if (!parsed.success) {
    throw statementError();
  }
  return { ...parsed.data, slugs: parsed.data.slugs.map((slug) => slug.toLowerCase()) };
}

/** A segment's own filter, parsed. Fails for a filter that isn't valid or names a segment. */
function definitionOf(segment: Segment): ParsedFilter {
  let parsed: ParsedFilter;
  try {
    parsed = parseFilter(segment.filter);
  } catch {
    throw new errors.BadRequestError({
      message: 'Segment filter is invalid.',
      context: `Segment ${segment.slug} has an invalid filter.`,
      property: 'filter',
    });
  }
  // A segment's filter can't name a segment, so a filter is expanded once and never recurses
  if (namesSegment(parsed)) {
    throw new errors.BadRequestError({
      message: 'Segment filter is invalid.',
      context: `Segment ${segment.slug} has a filter that names another segment.`,
      property: 'filter',
    });
  }
  return parsed;
}

/** Replaces each `segment` statement in `node`, and in the filters it holds, with its segments' filters. */
function expandObject(
  node: ParsedFilter,
  definitions: ReadonlyMap<string, ParsedFilter>,
): ParsedFilter {
  const conditions: ParsedFilter[] = [];
  const rest: ParsedNode = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === SEGMENT_KEY) {
      conditions.push(expandStatement(value, definitions));
    } else {
      rest[key] = expandNode(value, definitions);
    }
  }
  if (conditions.length === 0) {
    return rest;
  }
  if (Object.keys(rest).length > 0) {
    conditions.push(rest);
  }
  return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

/** Replaces each `segment` statement in `node`, a filter, a list of filters or a value. */
function expandNode(node: unknown, definitions: ReadonlyMap<string, ParsedFilter>): unknown {
  if (Array.isArray(node)) {
    return node.map((child) => expandNode(child, definitions));
  }
  if (!isPlainObject(node)) {
    return node;
  }
  return expandObject(node, definitions);
}

/** The filter that selects the members a `segment` statement names, or leaves out. */
function expandStatement(
  value: unknown,
  definitions: ReadonlyMap<string, ParsedFilter>,
): ParsedFilter {
  const { slugs, match } = statementOf(value);
  const filters = slugs.map((slug) => {
    const definition = definitions.get(slug);
    if (definition === undefined) {
      throw new errors.IncorrectUsageError({
        message: `Segment ${slug} was not read before the filter was expanded.`,
      });
    }
    // A copy for each place that names a segment, so changing one copy can't change another
    return structuredClone(definition);
  });
  if (match === 'none') {
    return { $nor: filters };
  }
  if (filters.length === 1) {
    return filters[0];
  }
  return match === 'every' ? { $and: filters } : { $or: filters };
}

/**
 * Reads the segments `filter` names from `source` and returns the filter with each `segment`
 * statement replaced by the segment's own filter. Throws a ValidationError when a text value is no
 * stored segment's slug, as a segment's id in quotes isn't, so a filter never runs without a
 * segment it names. Throws a BadRequestError for a value that isn't text, such as an unquoted
 * value the filter parser reads as a number, or an operator `segment` doesn't support, or for a
 * segment whose own filter is invalid or names another segment.
 */
export async function expandSegments(
  filter: ParsedFilter,
  source: SegmentSource,
): Promise<ParsedFilter> {
  const named: string[] = [];
  eachSegmentStatement(filter, (value) => named.push(...statementOf(value).slugs));
  if (named.length === 0) {
    return filter;
  }
  const unique = [...new Set(named)];
  const invalid = unique.filter((slug) => !SegmentSlug.safeParse(slug).success);
  if (invalid.length > 0) {
    throw notFoundError(invalid);
  }
  const slugs = unique.map((slug) => SegmentSlug.parse(slug));

  const found = new Map((await source(slugs)).map((segment) => [segment.slug, segment]));
  const missing = slugs.filter((slug) => !found.has(slug));
  if (missing.length > 0) {
    throw notFoundError(missing);
  }
  const definitions = new Map(
    slugs
      .flatMap((slug) => found.get(slug) ?? [])
      .map((segment) => [segment.slug, definitionOf(segment)]),
  );
  return expandObject(filter, definitions);
}
