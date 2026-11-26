import errors from '@tryghost/errors';
import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import type { RequestContext } from '../../lib/actor';
import { isUniqueViolation } from '../../lib/db-errors';
import { toDatabaseDate } from '../../lib/db-types/date';
import { ensureTransaction } from '../../lib/ensure-transaction';
import { sortable } from '../../lib/sortable';
import { SegmentAdded, SegmentDeleted, SegmentRenamed, type OnSegmentUpdated } from './changes';
import { filterNamesSegment } from './expansion';
import { Segment, SegmentId, type SegmentFilter, type SegmentName } from './models';
import { nameTakenError, normalizeName } from './rejections';
import type { SegmentChangeAttempt, SegmentsTracking } from './tracking';

/** A segment a command adds. */
export interface NewSegment {
  name: SegmentName;
  filter: SegmentFilter;
}

/**
 * A change to a segment. Only the name can change. A change can give the segment's own filter
 * back, so that a segment as the API returns it is a valid change. Any other filter is
 * rejected: changing a segment's filter isn't supported.
 */
export interface SegmentEdit {
  name: SegmentName;
  filter?: SegmentFilter;
}

interface SegmentsServiceDeps {
  knex: Knex;
  tracking: Pick<SegmentsTracking, 'change'>;
  /** Called with each change a command makes, inside the command's transaction. */
  onSegmentUpdated: OnSegmentUpdated;
}

const TABLE = 'segments';

const StoredSegment = Segment.optional();
const StoredSegments = z.array(Segment);

const hasName = (name: string) => (segment: Segment) =>
  normalizeName(segment.name) === normalizeName(name);

const notFoundError = () => new errors.NotFoundError({ message: 'Segment not found.' });

/** Rejects a change because no segment has the id in the request. */
function notFound(attempt: SegmentChangeAttempt): never {
  attempt.rejecting('not_found');
  throw notFoundError();
}

/** Rejects a change because another segment has the name. */
function nameTaken(attempt: SegmentChangeAttempt): never {
  attempt.rejecting('name_taken');
  throw nameTakenError();
}

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
 * Every method reads or writes through the executor it's given. Given a transaction, a command
 * joins it; given a plain connection, it opens its own. Each command reports the change it made
 * through `onSegmentUpdated` as its last step inside the transaction, so a failure there fails
 * the command. A command that opened its own transaction rolls the change back. A command that
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

  /** Every segment, in order. */
  async browse(executor: Knex = this.knex): Promise<Segment[]> {
    return StoredSegments.parse(
      await this.rows.inOrder(executor, {}).select('id', 'name', 'filter'),
    );
  }

  /** The segment with `id`. Fails with a NotFoundError when there's no such segment. */
  async read(id: string, executor: Knex = this.knex): Promise<Segment> {
    const row: unknown = await executor(TABLE).where('id', id).first('id', 'name', 'filter');
    const segment = StoredSegment.parse(row);
    if (!segment) {
      throw notFoundError();
    }
    return segment;
  }

  /** The segments with any of `ids`, in no particular order. */
  async readMany(ids: readonly SegmentId[], executor: Knex = this.knex): Promise<Segment[]> {
    if (ids.length === 0) {
      return [];
    }
    return StoredSegments.parse(
      await executor(TABLE).whereIn('id', ids).select('id', 'name', 'filter'),
    );
  }

  /**
   * Adds a segment after the others, and returns it. Fails with a ValidationError when another
   * segment has the name, or when its filter names a segment. Another segment can have the same
   * filter.
   */
  add(context: RequestContext, input: NewSegment, executor: Knex = this.knex): Promise<Segment> {
    return this.tracking.change('add', (attempt) =>
      ensureTransaction(executor, async (trx) => {
        // Expansion replaces a segment with its filter once, without recursing, so a segment's
        // filter can't name another segment
        if (filterNamesSegment(input.filter)) {
          attempt.rejecting('filter_names_segment');
          throw new errors.ValidationError({
            message: "A segment's filter cannot name another segment.",
            property: 'filter',
          });
        }
        const stored = await this.browse(trx);
        if (stored.some(hasName(input.name))) {
          nameTaken(attempt);
        }

        const segment = {
          id: SegmentId.parse(new ObjectID().toHexString()),
          name: input.name,
          filter: input.filter,
        };
        try {
          await this.rows.insert(trx, {}, { ...segment, created_at: toDatabaseDate(new Date()) });
        } catch (err) {
          // The table rejected the row although no stored segment had its name above: another
          // request took the name at the same time, or the database's collation counts the
          // name as another segment's.
          if (isUniqueViolation(err)) {
            nameTaken(attempt);
          }
          throw err;
        }

        await this.onSegmentUpdated(trx, context, new SegmentAdded(segment));
        return segment;
      }),
    );
  }

  /**
   * Renames the segment with `id`, and returns it. Fails with a NotFoundError when there's no
   * such segment, and with a ValidationError when another segment has the name, or when `input`
   * has a filter other than the segment's own, because a segment's filter can't change. A rename
   * to the name the segment already has changes nothing, so nothing is written or reported.
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
        // POC (poc/segments-ui): a segment's filter can change, so Admin can prototype editing
        // a segment's conditions. On main a filter other than the segment's own is rejected.
        const filter = input.filter ?? previous.filter;
        if (input.name === previous.name && filter === previous.filter) {
          attempt.unchanged();
          return previous;
        }
        // As for a new segment: expansion replaces a segment with its filter once, so a
        // segment's filter can't come to name another segment.
        if (filter !== previous.filter && filterNamesSegment(filter)) {
          attempt.rejecting('filter_names_segment');
          throw new errors.ValidationError({
            message: "A segment's filter cannot name another segment.",
            property: 'filter',
          });
        }

        // By the stored id: the database can match the request's id where it differs in case.
        const others = (await this.browse(trx)).filter(({ id: other }) => other !== previous.id);
        if (others.some(hasName(input.name))) {
          nameTaken(attempt);
        }
        try {
          await trx(TABLE)
            .where('id', previous.id)
            .update({ name: input.name, filter, updated_at: toDatabaseDate(new Date()) });
        } catch (err) {
          // The database's collation counts the name as another segment's, or another request
          // took the name at the same time.
          if (isUniqueViolation(err)) {
            nameTaken(attempt);
          }
          throw err;
        }

        const segment = { ...previous, name: input.name, filter };
        await this.onSegmentUpdated(trx, context, new SegmentRenamed(previous, segment));
        return segment;
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
   * POC (poc/segments-ui): puts the segments in the order of `ids`, the site's order for every
   * list of them, and returns them in it. Fails with a ValidationError, and changes nothing,
   * unless `ids` names every segment exactly once: an order that leaves one out, or names one
   * since deleted, was made from an out-of-date list. No segment changes, only the list around
   * them, so nothing is reported through `onSegmentUpdated` and no `updated_at` moves.
   */
  reorder(
    _context: RequestContext,
    ids: readonly string[],
    executor: Knex = this.knex,
  ): Promise<Segment[]> {
    return this.tracking.change('reorder', (attempt) =>
      ensureTransaction(executor, async (trx) => {
        try {
          await this.rows.reorder(trx, {}, ids);
        } catch (err) {
          if (err instanceof errors.ValidationError) {
            attempt.rejecting('order_out_of_date');
          }
          throw err;
        }
        return this.browse(trx);
      }),
    );
  }

  /** The segment with `id`, if there is one, with its row locked until `trx` ends. */
  private async lock(id: string, trx: Knex.Transaction): Promise<Segment | undefined> {
    const row: unknown = await trx(TABLE).where('id', id).forUpdate().first('id', 'name', 'filter');
    return StoredSegment.parse(row);
  }
}
