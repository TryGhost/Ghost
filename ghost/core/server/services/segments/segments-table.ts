import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';
import { z } from 'zod';
import { toDatabaseDate } from '../../lib/db-types/date';
import { sortable } from '../../lib/sortable';
import { Segment } from './models';

const TABLE = 'segments';

const StoredSegments = z.array(Segment);
const CodedError = z.object({ code: z.string() });

/** Whether a write failed because a value is already taken, such as a segment's name. */
function isUniqueViolation(err: unknown): boolean {
  const coded = CodedError.safeParse(err);
  return (
    coded.success &&
    (coded.data.code === 'ER_DUP_ENTRY' || coded.data.code.startsWith('SQLITE_CONSTRAINT'))
  );
}

/**
 * The segments table, kept as a copy of the segments stored somewhere else: every segment is a
 * row with the segment's id, and the rows are in the segments' order.
 *
 * A name is unique in the table as the database's collation compares names, which can count two
 * names as the same where the other store doesn't, such as "Cafe" and "Café". The database
 * decides: a copy that would give two rows the same name is rejected. A name longer than the
 * column holds is cut to fit.
 */
export class SegmentsTable {
  private readonly rows = sortable(TABLE, 'sort_order');
  private readonly maxNameLength: number;

  constructor({
    maxNameLength,
  }: {
    /** The most characters the table's `name` column holds. */
    maxNameLength: number;
  }) {
    this.maxNameLength = maxNameLength;
  }

  /**
   * Makes the table hold `segments`, in their order. Rows of segments that are not in `segments`
   * are deleted. Calls `nameTaken`, which throws, when the database counts the name of one of
   * `segments` as another's.
   *
   * The caller holds a lock that every writer of segments takes, from before `trx` first read.
   */
  async mirror(
    trx: Knex.Transaction,
    segments: readonly Segment[],
    nameTaken: () => never,
  ): Promise<void> {
    // A locking read, so that the rows are the committed ones even when `trx` has read before.
    const stored = StoredSegments.parse(
      await this.rows.inOrder(trx, {}).select('id', 'name', 'filter').forUpdate(),
    );
    const wanted = new Map(segments.map((segment) => [segment.id, segment]));
    const kept = stored.filter(({ id }) => wanted.has(id));
    const added = segments.filter(({ id }) => !kept.some((row) => row.id === id));

    const gone = stored.filter(({ id }) => !wanted.has(id)).map(({ id }) => id);
    if (gone.length > 0) {
      await trx(TABLE).whereIn('id', gone).del();
    }

    const names = new Map(kept.map((row) => [row.id, row.name]));
    const moved = segments.filter(
      ({ id, name }) => names.has(id) && names.get(id) !== this.fitted(name),
    );
    // Every row that changes its name gives the old one up first, so that a row can take a name
    // another row gives up in the same copy.
    for (const { id } of moved) {
      await trx(TABLE).where('id', id).update({ name: randomUUID() });
    }

    const now = toDatabaseDate(new Date());
    const unlessTaken = async (write: PromiseLike<unknown>) => {
      try {
        await write;
      } catch (err) {
        if (isUniqueViolation(err)) {
          nameTaken();
        }
        throw err;
      }
    };
    for (const { id, name } of moved) {
      await unlessTaken(
        trx(TABLE)
          .where('id', id)
          .update({ name: this.fitted(name), updated_at: now }),
      );
    }
    for (const { id, name, filter } of added) {
      await unlessTaken(
        trx(TABLE).insert({ id, name: this.fitted(name), filter, created_at: now }),
      );
      await this.rows.append(trx, {}, id);
    }

    // Kept rows are in their stored order, and each new row was appended after them.
    const order = [...kept, ...added].map(({ id }) => id);
    const wantedOrder = segments.map(({ id }) => id);
    if (order.some((id, position) => id !== wantedOrder[position])) {
      await this.rows.reorder(trx, {}, wantedOrder);
    }
  }

  /** `name`, cut to the most characters the name column holds. */
  private fitted(name: string): string {
    return [...name].slice(0, this.maxNameLength).join('');
  }
}
