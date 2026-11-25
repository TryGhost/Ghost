import type { Added, Deleted, Edited, OnUpdated } from '../../lib/changes';
import type { Segment } from './models';

/**
 * A change a segments command made, in the service's own terms. Each command makes one change,
 * which carries the whole segment as it was and as it is now.
 */
export type SegmentChange =
  /** A segment was added after the others. */
  | Added<'SegmentAdded', Segment>
  /** A segment's name changed. Its id and its filter stay the same. */
  | Edited<'SegmentRenamed', Segment>
  /** A segment was deleted. */
  | Deleted<'SegmentDeleted', Segment>;

/** The function the segments service calls with each change it makes. */
export type OnSegmentUpdated = OnUpdated<SegmentChange>;
