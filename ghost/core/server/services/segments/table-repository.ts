import errors from '@tryghost/errors';
import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
import { z } from 'zod';
import { toDatabaseDate } from '../../lib/db-types/date';
import { isUniqueViolation } from '../../lib/db-errors';
import { sortable } from '../../lib/sortable';
import { Segment, SegmentId } from './models';
import { nameTakenError, normalizeName } from './rejections';
import type { SegmentRepository } from './repository';
import type { SegmentChangeAttempt } from './tracking';

const TABLE = 'segments';

const StoredSegment = Segment.optional();
const StoredSegments = z.array(Segment);
function nameTaken(attempt: SegmentChangeAttempt): never {
  attempt.rejecting('name_taken');
  throw nameTakenError();
}

function notFound(attempt: SegmentChangeAttempt): never {
  attempt.rejecting('not_found');
  throw new errors.NotFoundError({ message: 'Segment not found.' });
}

/**
 * Segments stored as rows of the segments table, in the order of the table's sortable
 * collection.
 *
 * Two rules decide whether a name is taken, and a name either rule counts as another segment's
 * is rejected. The first ignores case and surrounding whitespace, and is the same on every
 * database. The second is the table's unique index, which compares names by the database's
 * collation: MySQL's default collation also ignores accents, so it counts "Cafe" and "Café" as
 * one name.
 */
export class TableSegmentRepository implements SegmentRepository {
  private readonly rows = sortable(TABLE);

  async list(executor: Knex): Promise<Segment[]> {
    return StoredSegments.parse(
      await this.rows.inOrder(executor, {}).select('id', 'name', 'filter'),
    );
  }

  async find(id: string, executor: Knex): Promise<Segment | undefined> {
    const row: unknown = await executor(TABLE).where('id', id).first('id', 'name', 'filter');
    return StoredSegment.parse(row);
  }

  async findForUpdate(id: string, trx: Knex.Transaction): Promise<Segment | undefined> {
    const row: unknown = await trx(TABLE).where('id', id).forUpdate().first('id', 'name', 'filter');
    return StoredSegment.parse(row);
  }

  async insert(
    input: Omit<Segment, 'id'>,
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
  ): Promise<Segment> {
    const stored = await this.list(trx);
    if (stored.some(({ name }) => normalizeName(name) === normalizeName(input.name))) {
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
      // request took the name at the same time, or the database's collation counts the name as
      // another segment's.
      if (isUniqueViolation(err)) {
        nameTaken(attempt);
      }
      throw err;
    }
    return segment;
  }

  async update(
    segment: Segment,
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
  ): Promise<Segment> {
    const others = (await this.list(trx)).filter(({ id }) => id !== segment.id);
    if (others.some(({ name }) => normalizeName(name) === normalizeName(segment.name))) {
      nameTaken(attempt);
    }

    let updated: number;
    try {
      // A segment's filter can't change, so only the name can differ from what's stored.
      updated = await trx(TABLE)
        .where('id', segment.id)
        .update({ name: segment.name, updated_at: toDatabaseDate(new Date()) });
    } catch (err) {
      if (isUniqueViolation(err)) {
        nameTaken(attempt);
      }
      throw err;
    }
    if (updated === 0) {
      notFound(attempt);
    }
    return segment;
  }

  async delete(
    segment: Segment,
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
  ): Promise<void> {
    const deleted = await trx(TABLE).where('id', segment.id).del();
    if (deleted === 0) {
      notFound(attempt);
    }
  }
}
