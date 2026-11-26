import errors from '@tryghost/errors';
import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import type { RequestContext } from '../../lib/actor';
import { uniqueViolationColumn } from '../../lib/db-errors';
import { databaseNow, toDatabaseDate } from '../../lib/db-types/date';
import { ensureTransaction } from '../../lib/ensure-transaction';
import { sortable } from '../../lib/sortable';
import { SegmentAdded, SegmentDeleted, SegmentEdited, type OnSegmentUpdated } from './changes';
import { filterNamesSegment } from './expansion';
import {
  FilterNamesSegmentError,
  FilterUnparseableError,
  NameTakenError,
  NoFreeSlugError,
  OrderOutOfDateError,
  type SegmentError,
  SlugChangedError,
  SlugTakenError,
  SlugUnusableError,
} from './errors';
import {
  isParseableFilter,
  normalizeName,
  readsBackInFilter,
  Segment,
  SegmentId,
  type SegmentFilter,
  type SegmentName,
  type SegmentSlug,
} from './models';
import { slugsForName } from './slugs';
import type { SegmentChangeAttempt, SegmentsTracking } from './tracking';

/** A segment a command adds. */
export interface NewSegment {
  name: SegmentName;
  filter: SegmentFilter;
  /**
   * The slug to give the segment. It has to be one a filter can name and that no other segment
   * has. Without one, the slug is minted from the name.
   */
  slug?: SegmentSlug;
}

/**
 * A change to a segment's name, its filter, or both. What a change leaves out stays as it is
 * stored, so a change that gives only the filter can't undo a rename made since the caller read
 * the segment. A change can give the segment's own slug back, so that a segment as the API
 * returns it is a valid change. Any other slug is rejected: a segment's slug doesn't change.
 */
export interface SegmentEdit {
  name?: SegmentName;
  filter?: SegmentFilter;
  slug?: SegmentSlug;
}

/** Which segments a browse returns: those with any of `slugs`, or every segment without it. */
export interface SegmentCriteria {
  slugs?: readonly SegmentSlug[];
}

interface SegmentsServiceDeps {
  knex: Knex;
  tracking: Pick<SegmentsTracking, 'change'>;
  /** Called with each change a command makes, inside the command's transaction. */
  onSegmentUpdated: OnSegmentUpdated;
}

const TABLE = 'segments';

/** The columns a segment is read from: one for each of its fields. */
const COLUMNS = Segment.keyof().options;

const StoredSegment = Segment.optional();
const StoredSegments = z.array(Segment);

const hasName = (name: string) => (segment: Segment) =>
  normalizeName(segment.name) === normalizeName(name);

const notFoundError = () => new errors.NotFoundError({ message: 'Segment not found.' });

/** A new segment's id. */
const newId = () => SegmentId.parse(new ObjectID().toHexString());

/** Rejects a change because no segment has the id in the request. */
function notFound(attempt: SegmentChangeAttempt): never {
  attempt.rejecting('not_found');
  throw notFoundError();
}

/** Rejects a change with `error`, after recording on the change's span why it was rejected. */
function reject(attempt: SegmentChangeAttempt, error: SegmentError): never {
  attempt.rejecting(error.reason);
  throw error;
}

/** Which value that must be unique another segment has, when the table rejects a new row. */
type Clash = 'name' | 'slug';

/**
 * Segments: named filters over members, which Admin shows as saved member views. They are rows
 * of the segments table, in the order of the table's sortable collection.
 *
 * Two rules decide whether a name is taken, and a name either rule counts as another segment's
 * is rejected. The first ignores case and surrounding whitespace, and is the same on every
 * database. The second is the table's unique index, which compares names by the database's
 * collation: MySQL's default collation also ignores accents, so it counts "Cafe" and "Café" as
 * one name.
 *
 * Each segment has a readable slug, which a members filter names it by and which doesn't change
 * when the segment is renamed. A caller
 * that adds a segment can give its slug, which has to be one a filter can name and that no other
 * segment has; otherwise the slug is minted from the name. Two segments can't have one slug, and
 * a deleted segment's slug can be given to a segment added later.
 *
 * Every method reads or writes through the executor it's given. Given a transaction, a command
 * joins it; given a plain connection, it opens its own. Each command but a reorder, which History
 * doesn't record, reports the change it made through `onSegmentUpdated` as its last step inside
 * the transaction, so a failure there fails the command. A command that opened its own transaction rolls the change back. A command that
 * joined a transaction leaves the rollback to the caller, who must not commit after a failure.
 * A change that is rejected has written nothing, so a caller's transaction can go on after it.
 *
 * Each command records a span through `tracking`, with whether it succeeded, was rejected or
 * failed.
 */
export class SegmentsService {
  private readonly knex: Knex;
  private readonly tracking: Pick<SegmentsTracking, 'change'>;
  private readonly onSegmentUpdated: OnSegmentUpdated;
  private readonly rows = sortable(TABLE);

  constructor({ knex, tracking, onSegmentUpdated }: SegmentsServiceDeps) {
    this.knex = knex;
    this.tracking = tracking;
    this.onSegmentUpdated = onSegmentUpdated;
  }

  /** The segments `criteria` selects, in order: every segment without any criteria. */
  async browse(criteria: SegmentCriteria = {}, executor: Knex = this.knex): Promise<Segment[]> {
    const query = this.rows.inOrder(executor, {});
    if (criteria.slugs !== undefined) {
      if (criteria.slugs.length === 0) {
        return [];
      }
      query.whereIn(`${TABLE}.slug`, criteria.slugs);
    }
    return StoredSegments.parse(await query.select(...COLUMNS));
  }

  /** The segment with `id`. Fails with a NotFoundError when there's no such segment. */
  async read(id: string, executor: Knex = this.knex): Promise<Segment> {
    const row: unknown = await executor(TABLE)
      .where('id', id)
      .first(...COLUMNS);
    const segment = StoredSegment.parse(row);
    if (!segment) {
      throw notFoundError();
    }
    return segment;
  }

  /**
   * Adds a segment after the others, and returns it, created now and not yet edited. Its slug is
   * the one `input` gives, or else the first slug minted from its name that no other segment has.
   * Fails with a ValidationError when another segment has the name, when its filter isn't valid
   * NQL or names a segment, or when `input` gives a slug that a filter can't name or that another
   * segment has. Another segment can have the same filter.
   */
  add(context: RequestContext, input: NewSegment, executor: Knex = this.knex): Promise<Segment> {
    return this.tracking.change('add', (attempt) =>
      ensureTransaction(executor, async (trx) => {
        if (!isParseableFilter(input.filter)) {
          reject(attempt, new FilterUnparseableError());
        }
        // Expansion replaces a segment with its filter once, without recursing, so a segment's
        // filter can't name another segment
        if (filterNamesSegment(input.filter)) {
          reject(attempt, new FilterNamesSegmentError());
        }
        if (input.slug !== undefined && !readsBackInFilter(input.slug)) {
          reject(attempt, new SlugUnusableError());
        }
        const stored = await this.browse({}, trx);
        if (stored.some(hasName(input.name))) {
          reject(attempt, new NameTakenError());
        }

        // One time for both, so a new segment's `updated_at` is its `created_at`.
        const now = databaseNow();
        const segment = {
          id: newId(),
          name: input.name,
          filter: input.filter,
          created_at: now,
          updated_at: now,
        };
        const added =
          input.slug === undefined
            ? await this.insertMinted(trx, attempt, segment, stored)
            : await this.insertGiven(trx, attempt, { ...segment, slug: input.slug }, stored);
        await this.onSegmentUpdated(trx, context, new SegmentAdded(added));
        return added;
      }),
    );
  }

  /**
   * Changes the name, the filter, or both, of the segment with `id`, and returns it, edited now.
   * Its slug and its place stay as they are. Fails with a NotFoundError when there's no such
   * segment, and with a ValidationError when another segment has the name, when `input` has a
   * filter other than the segment's own that isn't valid NQL or names a segment, or when `input`
   * has a slug other than the segment's own, because a segment's slug can't change. The segment's
   * own filter is accepted back as it is stored, even when it isn't valid NQL, as a stored filter
   * can be. A change that leaves the name and the filter as they are changes nothing, so nothing
   * is written or reported, and the segment keeps the time it was last edited.
   */
  edit(
    context: RequestContext,
    id: string,
    input: SegmentEdit,
    executor: Knex = this.knex,
  ): Promise<Segment> {
    return this.tracking.change('edit', (attempt) =>
      ensureTransaction(executor, async (trx) => {
        const previous = (await this.lock(id, trx)) ?? notFound(attempt);
        if (input.filter !== undefined && input.filter !== previous.filter) {
          if (!isParseableFilter(input.filter)) {
            reject(attempt, new FilterUnparseableError());
          }
          if (filterNamesSegment(input.filter)) {
            reject(attempt, new FilterNamesSegmentError());
          }
        }
        if (input.slug !== undefined && input.slug !== previous.slug) {
          reject(attempt, new SlugChangedError());
        }
        const name = input.name ?? previous.name;
        const filter = input.filter ?? previous.filter;
        if (name === previous.name && filter === previous.filter) {
          attempt.unchanged();
          return previous;
        }

        if (name !== previous.name) {
          // By the stored id: the database can match the request's id where it differs in case.
          const others = (await this.browse({}, trx)).filter(
            ({ id: other }) => other !== previous.id,
          );
          if (others.some(hasName(name))) {
            reject(attempt, new NameTakenError());
          }
        }
        const segment = { ...previous, name, filter, updated_at: databaseNow() };
        try {
          await trx(TABLE)
            .where('id', previous.id)
            .update({ name, filter, updated_at: toDatabaseDate(segment.updated_at) });
        } catch (err) {
          // The database's collation counts the name as another segment's, or another request
          // took the name at the same time.
          if (uniqueViolationColumn(err, TABLE) === 'name') {
            reject(attempt, new NameTakenError());
          }
          throw err;
        }

        await this.onSegmentUpdated(trx, context, new SegmentEdited(previous, segment));
        return segment;
      }),
    );
  }

  /**
   * Puts the segments in the order of `ids`, and returns them in it. Fails with a ValidationError,
   * and changes nothing, unless `ids` names every segment exactly once.
   */
  reorder(ids: readonly string[], executor: Knex = this.knex): Promise<Segment[]> {
    return this.tracking.change('reorder', (attempt) =>
      ensureTransaction(executor, async (trx) => {
        // Nothing may read before the collection's reorder locks the segments: the first plain
        // read fixes what the transaction sees, and could then list a segment deleted since.
        try {
          await this.rows.reorder(trx, {}, ids);
        } catch (err) {
          // The collection's reorder fails with a ValidationError only for an incomplete order.
          if (err instanceof errors.ValidationError) {
            reject(attempt, new OrderOutOfDateError());
          }
          throw err;
        }
        return this.browse({}, trx);
      }),
    );
  }

  /**
   * Deletes the segment with `id`, and returns it. Fails with a NotFoundError when there's no
   * such segment.
   */
  destroy(context: RequestContext, id: string, executor: Knex = this.knex): Promise<Segment> {
    return this.tracking.change('delete', (attempt) =>
      ensureTransaction(executor, async (trx) => {
        const segment = (await this.lock(id, trx)) ?? notFound(attempt);
        await trx(TABLE).where('id', segment.id).del();
        await this.onSegmentUpdated(trx, context, new SegmentDeleted(segment));
        return segment;
      }),
    );
  }

  /**
   * Inserts `segment` under the slug it was given. Rejects it when one of `stored` has that slug,
   * and when the table rejects the row because another segment has the name or the slug, as one
   * another request added at the same time can: the caller asked for this slug, so no other is
   * tried.
   */
  private async insertGiven(
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
    segment: Segment,
    stored: readonly Segment[],
  ): Promise<Segment> {
    if (stored.some(({ slug }) => slug === segment.slug)) {
      reject(attempt, new SlugTakenError());
    }
    const clash = await this.insert(trx, segment);
    if (clash === 'name') {
      reject(attempt, new NameTakenError());
    }
    if (clash === 'slug') {
      reject(attempt, new SlugTakenError());
    }
    return segment;
  }

  /**
   * Inserts `segment` under the first slug minted from its name that none of `stored` has, and
   * returns it with that slug. The table rejects the row when another segment has the name or the
   * slug, which `stored` didn't show: one another request added at the same time, or a name the
   * database's collation counts as the same. A taken name rejects the segment. A taken slug is
   * skipped for the next one minted, so segments added at the same time whose names mint the same
   * slug are all added. Fails with a ValidationError when every slug minted from the name is
   * taken.
   */
  private async insertMinted(
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
    segment: Omit<Segment, 'slug'>,
    stored: readonly Segment[],
  ): Promise<Segment> {
    for (const slug of slugsForName(segment.name, new Set(stored.map((other) => other.slug)))) {
      const added = { ...segment, slug };
      const clash = await this.insert(trx, added);
      if (clash === undefined) {
        return added;
      }
      if (clash === 'name') {
        reject(attempt, new NameTakenError());
      }
    }
    return reject(attempt, new NoFreeSlugError());
  }

  /**
   * Inserts `segment` after the others. Returns which value another segment has when the table's
   * unique index rejects the row, which the database's error names, and undefined when the row
   * is added. Any other rejection is thrown as it is.
   */
  private async insert(trx: Knex.Transaction, segment: Segment): Promise<Clash | undefined> {
    try {
      await this.rows.insert(
        trx,
        {},
        {
          ...segment,
          created_at: toDatabaseDate(segment.created_at),
          updated_at: toDatabaseDate(segment.updated_at),
        },
      );
      return undefined;
    } catch (err) {
      const column = uniqueViolationColumn(err, TABLE);
      if (column === 'name' || column === 'slug') {
        return column;
      }
      throw err;
    }
  }

  /** The segment with `id`, if there is one, with its row locked until `trx` ends. */
  private async lock(id: string, trx: Knex.Transaction): Promise<Segment | undefined> {
    const row: unknown = await trx(TABLE)
      .where('id', id)
      .forUpdate()
      .first(...COLUMNS);
    return StoredSegment.parse(row);
  }
}
