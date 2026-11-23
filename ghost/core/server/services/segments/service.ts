import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { RequestContext } from '../../lib/actor';
import { ensureTransaction } from '../../lib/ensure-transaction';
import type { OnSegmentUpdated } from './changes';
import type { Segment, SegmentFilter, SegmentName } from './models';
import type { SegmentRepository } from './repository';

/** A segment a command adds. */
export interface NewSegment {
  name: SegmentName;
  filter: SegmentFilter;
}

/**
 * A change to a segment. Only the name can change: the filter is what identifies a saved
 * member view, so a different filter is saved as a new segment instead. A change can give the
 * segment's own filter back, so that a segment as the API returns it is a valid change.
 */
export interface SegmentEdit {
  name: SegmentName;
  filter?: SegmentFilter;
}

interface SegmentsServiceDeps {
  knex: Knex;
  repository: SegmentRepository;
  /** Called with each change a command makes, inside the command's transaction. */
  onSegmentUpdated: OnSegmentUpdated;
}

function notFound(): never {
  throw new errors.NotFoundError({ message: 'Segment not found.' });
}

/**
 * Segments: named filters over members, which Admin shows as saved member views.
 *
 * Every method reads or writes through the executor it's given. Given a transaction, a command
 * joins it; given a plain connection, it opens its own. Each command reports the change it made
 * through `onSegmentUpdated` as its last step inside the transaction, so a failure there fails
 * the command. A command that opened its own transaction rolls the change back. A command that
 * joined a transaction leaves the rollback to the caller, who must not commit after a failure.
 */
export class SegmentsService {
  private readonly knex: Knex;
  private readonly repository: SegmentRepository;
  private readonly onSegmentUpdated: OnSegmentUpdated;

  constructor({ knex, repository, onSegmentUpdated }: SegmentsServiceDeps) {
    this.knex = knex;
    this.repository = repository;
    this.onSegmentUpdated = onSegmentUpdated;
  }

  /** Every segment, in order. */
  browse(executor: Knex = this.knex): Promise<Segment[]> {
    return this.repository.list(executor);
  }

  /** The segment with `id`. Fails with a NotFoundError when there's no such segment. */
  async read(id: string, executor: Knex = this.knex): Promise<Segment> {
    return (await this.repository.find(id, executor)) ?? notFound();
  }

  /** Adds a segment after the others, and returns it. */
  add(context: RequestContext, input: NewSegment, executor: Knex = this.knex): Promise<Segment> {
    return ensureTransaction(executor, async (trx) => {
      const segment = await this.repository.insert(input, trx);
      await this.onSegmentUpdated(trx, context, {
        type: 'SegmentAdded',
        verb: 'added',
        next: segment,
      });
      return segment;
    });
  }

  /**
   * Renames the segment with `id`, and returns it. Fails with a NotFoundError when there's no
   * such segment, and with a ValidationError when `input` has a filter other than the segment's
   * own, because a segment's filter can't change. A rename to the name the segment already has
   * changes nothing, so nothing is written or reported.
   */
  edit(
    context: RequestContext,
    id: string,
    input: SegmentEdit,
    executor: Knex = this.knex,
  ): Promise<Segment> {
    return ensureTransaction(executor, async (trx) => {
      const previous = (await this.repository.findForUpdate(id, trx)) ?? notFound();
      if (input.filter !== undefined && input.filter !== previous.filter) {
        throw new errors.ValidationError({
          message: "A segment's filter cannot be changed",
          property: 'filter',
        });
      }
      if (input.name === previous.name) {
        return previous;
      }

      const segment = await this.repository.update({ ...previous, name: input.name }, trx);
      await this.onSegmentUpdated(trx, context, {
        type: 'SegmentRenamed',
        verb: 'edited',
        previous,
        next: segment,
      });
      return segment;
    });
  }

  /**
   * Deletes the segment with `id`, and returns it. Fails with a NotFoundError when there's no
   * such segment.
   */
  destroy(context: RequestContext, id: string, executor: Knex = this.knex): Promise<Segment> {
    return ensureTransaction(executor, async (trx) => {
      const segment = (await this.repository.findForUpdate(id, trx)) ?? notFound();
      await this.repository.delete(segment, trx);
      await this.onSegmentUpdated(trx, context, {
        type: 'SegmentDeleted',
        verb: 'deleted',
        previous: segment,
      });
      return segment;
    });
  }
}
