import { Added, Deleted, Edited, type OnUpdated } from '../../lib/changes';
import type { Segment } from './models';

/** A segment was added after the others. */
export class SegmentAdded extends Added('SegmentAdded')<Segment> {}

/** A segment's name changed. Its id, its slug and its filter stay the same. */
export class SegmentRenamed extends Edited('SegmentRenamed')<Segment> {}

/** A segment was deleted. */
export class SegmentDeleted extends Deleted('SegmentDeleted')<Segment> {}

/**
 * A change a segments command made, in the service's own terms. Each command makes one change,
 * which carries the whole segment as it was and as it is now.
 */
export type SegmentChange = SegmentAdded | SegmentRenamed | SegmentDeleted;

/** The function the segments service calls with each change it makes. */
export type OnSegmentUpdated = OnUpdated<SegmentChange>;
