import type { Tracer } from '../../lib/tracing/tracer';

// The span names, attribute names and counter names for segments, which dashboards query. The
// service and its repository report what happened, and this module decides how it is recorded.

/**
 * Why a change to a segment was rejected:
 *
 * - `not_found`: no segment has the id in the request.
 * - `name_taken`: another segment already has the name, or a name the database counts as the
 *   same.
 * - `filter_changed`: the request has a filter that isn't the segment's own.
 *
 * Any other error is a failure.
 */
export type SegmentRejection = 'not_found' | 'name_taken' | 'filter_changed';

/** What a command that changes a segment, and the repository the command uses, report. */
export interface SegmentChangeAttempt {
  /**
   * Call before throwing the error that rejects the change. The span still fails with that
   * error, and records `reason`, so a dashboard can distinguish rejected changes from failed ones.
   */
  rejecting(reason: SegmentRejection): void;
  /** Call when the change succeeds without writing, because the segment already matches it. */
  unchanged(): void;
}

/** The name of the span for each command that changes a segment. */
const CHANGE_SPANS = {
  add: 'segments.add',
  edit: 'segments.edit',
  delete: 'segments.delete',
} as const;

export type SegmentsTracking = ReturnType<typeof segmentsTracking>;

export function segmentsTracking({ tracer }: { tracer: Tracer }) {
  return {
    /**
     * Records one span for each command that changes a segment. When the command opens its own
     * transaction, the span includes the commit. When
     * the command joins the caller's transaction, the span ends before the caller commits, so a
     * change the caller then rolls back is still recorded as a success.
     */
    change<Result>(
      command: keyof typeof CHANGE_SPANS,
      run: (attempt: SegmentChangeAttempt) => Promise<Result>,
    ): Promise<Result> {
      return tracer.track(CHANGE_SPANS[command], (span) =>
        run({
          rejecting(reason) {
            span.setAttribute('rejection', reason);
          },
          unchanged() {
            span.setAttribute('unchanged', true);
          },
        }),
      );
    },
  };
}
