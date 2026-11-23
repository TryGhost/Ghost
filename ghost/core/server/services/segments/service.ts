import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { RequestContext } from '../../lib/actor';
import { ensureTransaction } from '../../lib/ensure-transaction';
import type { OnSegmentUpdated } from './changes';
import type { Segment, SegmentFilter, SegmentName } from './models';
import type { SegmentRepository } from './repository';
import type { SegmentChangeAttempt, SegmentsTracking } from './tracking';

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
  tracking: Pick<SegmentsTracking, 'change'>;
  /** Called with each change a command makes, inside the command's transaction. */
  onSegmentUpdated: OnSegmentUpdated;
}

const notFoundError = () => new errors.NotFoundError({ message: 'Segment not found.' });

/** Rejects a change because no segment has the id in the request. */
function notFound(attempt: SegmentChangeAttempt): never {
  attempt.rejecting('not_found');
  throw notFoundError();
}

/**
 * Segments: named filters over members, which Admin shows as saved member views.
 *
 * Every method reads or writes through the executor it's given. Given a transaction, a command
 * joins it; given a plain connection, it opens its own. Each command reports the change it made
 * through `onSegmentUpdated` as its last step inside the transaction, so a failure there fails
 * the command. A command that opened its own transaction rolls the change back. A command that
 * joined a transaction leaves the rollback to the caller, who must not commit after a failure.
 *
 * Each command records a span through `tracking`, with whether it succeeded, was rejected or
 * failed.
 */
export class SegmentsService {
  private readonly knex: Knex;
  private readonly repository: SegmentRepository;
  private readonly tracking: Pick<SegmentsTracking, 'change'>;
  private readonly onSegmentUpdated: OnSegmentUpdated;

  constructor({ knex, repository, tracking, onSegmentUpdated }: SegmentsServiceDeps) {
    this.knex = knex;
    this.repository = repository;
    this.tracking = tracking;
    this.onSegmentUpdated = onSegmentUpdated;
  }

  /** Every segment, in order. */
  browse(executor: Knex = this.knex): Promise<Segment[]> {
    return this.repository.list(executor);
  }

  /** The segment with `id`. Fails with a NotFoundError when there's no such segment. */
  async read(id: string, executor: Knex = this.knex): Promise<Segment> {
    const segment = await this.repository.find(id, executor);
    if (!segment) {
      throw notFoundError();
    }
    return segment;
  }

  /** Adds a segment after the others, and returns it. */
  add(context: RequestContext, input: NewSegment, executor: Knex = this.knex): Promise<Segment> {
    return this.tracking.change('add', (attempt) =>
      ensureTransaction(executor, async (trx) => {
        const segment = await this.repository.insert(input, trx, attempt);
        await this.onSegmentUpdated(trx, context, {
          type: 'SegmentAdded',
          verb: 'added',
          next: segment,
        });
        return segment;
      }),
    );
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
    return this.tracking.change('edit', (attempt) =>
      ensureTransaction(executor, async (trx) => {
        const previous = (await this.repository.findForUpdate(id, trx)) ?? notFound(attempt);
        if (input.filter !== undefined && input.filter !== previous.filter) {
          attempt.rejecting('filter_changed');
          throw new errors.ValidationError({
            message: "A segment's filter cannot be changed",
            property: 'filter',
          });
        }
        if (input.name === previous.name) {
          attempt.unchanged();
          return previous;
        }

        const segment = await this.repository.update(
          { ...previous, name: input.name },
          trx,
          attempt,
        );
        await this.onSegmentUpdated(trx, context, {
          type: 'SegmentRenamed',
          verb: 'edited',
          previous,
          next: segment,
        });
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
        const segment = (await this.repository.findForUpdate(id, trx)) ?? notFound(attempt);
        await this.repository.delete(segment, trx, attempt);
        await this.onSegmentUpdated(trx, context, {
          type: 'SegmentDeleted',
          verb: 'deleted',
          previous: segment,
        });
        return segment;
      }),
    );
  }
}
