import type { Knex } from 'knex';
import type { Segment } from './models';
import type { SegmentRepository } from './repository';
import type { SegmentsTable } from './segments-table';
import { nameTaken } from './settings-repository';
import type { SegmentChangeAttempt } from './tracking';

/**
 * Segments stored in `source`, with every change also written to the segments table in the same
 * transaction. `source` stays the store that is read. The table is a copy: after each change it
 * holds the segments `source` holds, in the same order.
 *
 * A name is unique in the table as the database compares names, which `source` may not be, so a
 * change `source` accepts is still rejected when it would give two rows of the table the same
 * name. The rejection fails the transaction, so `source` keeps what it held.
 *
 * Every write to `source` locks its store before reading, so writes through this repository
 * take turns, which is the lock the table's writes need.
 */
export class MirroringSegmentRepository implements SegmentRepository {
  private readonly source: SegmentRepository;
  private readonly table: SegmentsTable;

  constructor({ source, table }: { source: SegmentRepository; table: SegmentsTable }) {
    this.source = source;
    this.table = table;
  }

  list(executor: Knex): Promise<Segment[]> {
    return this.source.list(executor);
  }

  find(id: string, executor: Knex): Promise<Segment | undefined> {
    return this.source.find(id, executor);
  }

  findForUpdate(id: string, trx: Knex.Transaction): Promise<Segment | undefined> {
    return this.source.findForUpdate(id, trx);
  }

  async insert(
    segment: Omit<Segment, 'id'>,
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
  ): Promise<Segment> {
    const inserted = await this.source.insert(segment, trx, attempt);
    await this.mirror(trx, attempt);
    return inserted;
  }

  async update(
    segment: Segment,
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
  ): Promise<Segment> {
    const updated = await this.source.update(segment, trx, attempt);
    await this.mirror(trx, attempt);
    return updated;
  }

  async delete(
    segment: Segment,
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
  ): Promise<void> {
    await this.source.delete(segment, trx, attempt);
    await this.mirror(trx, attempt);
  }

  private async mirror(trx: Knex.Transaction, attempt: SegmentChangeAttempt): Promise<void> {
    await this.table.mirror(trx, await this.source.list(trx), () => nameTaken(attempt));
  }
}
