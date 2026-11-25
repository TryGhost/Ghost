import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { FilterStep } from '../lib/filters';
import { expandSegments, namesSegment } from '../services/segments/expansion';
import type { Segment, SegmentId } from '../services/segments/models';

// A members filter names a saved segment with the `segment` key. The members model's first filter
// step reads the segments a filter names and replaces each `segment` statement with the segment's
// own filter, whoever runs the query.

/** What members filters read the segments they name with. Boot supplies it. */
export interface FilterSegments {
  /** Whether members filters can name segments, which the segmentEmails flag decides. */
  isEnabled: () => boolean;
  /** Reads the segments with any of `ids`, in the given transaction or on the default connection. */
  read: (ids: readonly SegmentId[], executor?: Knex) => Promise<readonly Segment[]>;
}

let segments: FilterSegments | undefined;

/** Gives members filters the segments they name. Boot calls this once the segments service is ready. */
export function readSegmentsWith(source: FilterSegments): void {
  segments = source;
}

/**
 * The step that puts each segment a members filter names in its place. While segments are off,
 * or before boot supplies them, `segment` isn't a members filter key and a filter that names a
 * segment is rejected. Otherwise the segments are read, in the query's transaction when it runs
 * in one; see `expandSegments` for the errors a filter that names them can fail with.
 */
export const segmentStep: FilterStep = async (filter, { transacting }) => {
  const source = segments;
  if (!source?.isEnabled()) {
    if (namesSegment(filter)) {
      throw new errors.BadRequestError({
        message: 'Segments cannot be used in this filter.',
        property: 'filter',
      });
    }
    return filter;
  }
  return expandSegments(filter, (ids) => source.read(ids, transacting));
};
