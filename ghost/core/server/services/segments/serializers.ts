import { z } from 'zod';
import { ObjectIdSchema } from '../../../../database/columns/object-id';
import { Segment, SegmentFilter, SegmentName } from './models';
import type { NewSegment, SegmentEdit } from './service';

/** The segment a route names. A malformed id is rejected rather than looked up. */
export const SegmentRoute = z.object({ id: ObjectIdSchema });

// A request can send a segment back as the API returned it, so its read-only `id` is accepted
// and dropped. Any other field the schema doesn't name is rejected.
const ReadOnlyId = z.string().optional();

/** A new segment as a request sends it. */
export const NewSegmentBody = z
  .strictObject({ id: ReadOnlyId, name: SegmentName, filter: SegmentFilter })
  .transform(({ name, filter }): NewSegment => ({ name, filter }));

/** A change to a segment as a request sends it. */
export const SegmentEditBody = z
  .strictObject({ id: ReadOnlyId, name: SegmentName, filter: SegmentFilter.optional() })
  .transform(({ name, filter }): SegmentEdit => ({ name, filter }));

const SegmentResource = z.object({
  id: z.string(),
  name: z.string(),
  filter: z.string(),
});
const SegmentsResponse = z.object({ segments: z.array(SegmentResource) });

export const toSegmentsResponse = z
  .array(Segment)
  .transform((segments): z.input<typeof SegmentsResponse> => ({ segments }))
  .pipe(SegmentsResponse);
