import type { Knex } from 'knex';
import type { Segment } from './models';
import type { SegmentChangeAttempt } from './tracking';

/**
 * Where segments are stored. Reads go through the executor they're given and writes through the
 * transaction they're given. The repository rejects a name, or a new segment's filter, that
 * another segment already has. A method that writes reports to `attempt` why it rejects a
 * change, before it throws.
 */
export interface SegmentRepository {
  /** Every segment, in order. */
  list(executor: Knex): Promise<Segment[]>;
  /** The segment with `id`, if there is one. */
  find(id: string, executor: Knex): Promise<Segment | undefined>;
  /** The segment with `id`, if there is one. Other writes to segments wait until `trx` ends. */
  findForUpdate(id: string, trx: Knex.Transaction): Promise<Segment | undefined>;
  /** Stores a new segment after the others, and returns it. */
  insert(
    segment: Omit<Segment, 'id'>,
    trx: Knex.Transaction,
    attempt: SegmentChangeAttempt,
  ): Promise<Segment>;
  /**
   * Stores `segment` over the stored segment with its id, and returns it. Fails with a
   * NotFoundError when there's no such stored segment.
   */
  update(segment: Segment, trx: Knex.Transaction, attempt: SegmentChangeAttempt): Promise<Segment>;
  /** Deletes `segment`. Fails with a NotFoundError when there's no such stored segment. */
  delete(segment: Segment, trx: Knex.Transaction, attempt: SegmentChangeAttempt): Promise<void>;
}
