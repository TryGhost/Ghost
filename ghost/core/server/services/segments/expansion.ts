import errors from '@tryghost/errors';
import { z } from 'zod';
import { type ParsedFilter, parseFilter } from '../../lib/filters';
import { ObjectIdSchema } from '../../lib/db-types/object-id';
import { type Segment, SegmentId } from './models';

// A members filter names a segment with the `segment` key, whose value is the segment's id, as
// in `segment:'<id>'` or `segment:['<id>','<id>']`. Before a members query runs, each `segment`
// statement of the parsed filter is replaced by the segment's own parsed filter.

/** The members filter key that names a segment. */
const SEGMENT_KEY = 'segment';

/**
 * Reads the segments with any of `ids`, from the segments table or from a copy of them, such as
 * the one an email will keep of the segments it was sent to.
 */
export type SegmentSource = (ids: readonly SegmentId[]) => Promise<readonly Segment[]>;

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

const SegmentIds = z.array(z.string()).min(1);

/** The ids a `segment` statement names, and whether a member has to be in any or every one. */
const SegmentStatement = z.union([
  z.string().transform((id) => ({ ids: [id], match: 'any' as const })),
  z.strictObject({ $in: SegmentIds }).transform(({ $in }) => ({ ids: $in, match: 'any' as const })),
  z
    .strictObject({ $all: SegmentIds })
    .transform(({ $all }) => ({ ids: $all, match: 'every' as const })),
]);

const statementError = () =>
  new errors.BadRequestError({
    message: 'Invalid segment filter.',
    context:
      "A filter names a segment by its id, as in segment:'<id>', segment:['<id>','<id>'] for any of several, or segment:['<id>'+'<id>'] for all of them.",
    property: 'filter',
  });

const notFoundError = (ids: readonly string[]) =>
  new errors.ValidationError({
    message: 'Segment not found.',
    context: `No segment has the id ${ids.join(', ')}.`,
    property: 'filter',
  });

/** Parses a `segment` statement's value, with its ids in lowercase as the table stores them. */
function statementOf(value: unknown) {
  const parsed = SegmentStatement.safeParse(value);
  if (!parsed.success) {
    throw statementError();
  }
  return { ...parsed.data, ids: parsed.data.ids.map((id) => id.toLowerCase()) };
}

/** A segment's own filter, parsed. Fails for a filter that isn't valid or names a segment. */
function definitionOf(segment: Segment): ParsedFilter {
  let parsed: ParsedFilter;
  try {
    parsed = parseFilter(segment.filter);
  } catch {
    throw new errors.BadRequestError({
      message: 'Segment filter is invalid.',
      context: `Segment ${segment.id} has an invalid filter.`,
      property: 'filter',
    });
  }
  // A segment's filter can't name a segment, so a filter is expanded once and never recurses
  if (namesSegment(parsed)) {
    throw new errors.BadRequestError({
      message: 'Segment filter is invalid.',
      context: `Segment ${segment.id} has a filter that names another segment.`,
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

/** The filter that selects the members a `segment` statement names. */
function expandStatement(
  value: unknown,
  definitions: ReadonlyMap<string, ParsedFilter>,
): ParsedFilter {
  const { ids, match } = statementOf(value);
  const filters = ids.map((id) => {
    const definition = definitions.get(id);
    if (definition === undefined) {
      throw new errors.IncorrectUsageError({
        message: `Segment ${id} was not read before the filter was expanded.`,
      });
    }
    // A copy for each place that names a segment, so changing one copy can't change another
    return structuredClone(definition);
  });
  if (filters.length === 1) {
    return filters[0];
  }
  return match === 'every' ? { $and: filters } : { $or: filters };
}

/**
 * Reads the segments `filter` names from `source` and returns the filter with each `segment`
 * statement replaced by the segment's own filter. Throws a ValidationError when a segment it names
 * doesn't exist or the value isn't a segment id, so a filter never runs without a segment it
 * names. Throws a BadRequestError for an operator `segment` doesn't support, or for a segment
 * whose own filter is invalid or names another segment.
 */
export async function expandSegments(
  filter: ParsedFilter,
  source: SegmentSource,
): Promise<ParsedFilter> {
  const named: string[] = [];
  eachSegmentStatement(filter, (value) => named.push(...statementOf(value).ids));
  if (named.length === 0) {
    return filter;
  }
  const unique = [...new Set(named)];
  const invalid = unique.filter((id) => !ObjectIdSchema.safeParse(id).success);
  if (invalid.length > 0) {
    throw notFoundError(invalid);
  }
  const ids = unique.map((id) => SegmentId.parse(id));

  const found = new Map((await source(ids)).map((segment) => [segment.id, segment]));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw notFoundError(missing);
  }
  const definitions = new Map(
    ids.flatMap((id) => found.get(id) ?? []).map((segment) => [segment.id, definitionOf(segment)]),
  );
  return expandObject(filter, definitions);
}
