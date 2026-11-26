import { z } from 'zod';
import { ObjectIdSchema } from '../../lib/db-types/object-id';
import { Segment, SegmentFilter, SegmentName, SegmentSlug } from './models';
import type { NewSegment, SegmentEdit } from './service';

/** The segment a route names. A malformed id is rejected rather than looked up. */
export const SegmentRoute = z.object({ id: ObjectIdSchema });

// A request can send a segment back as the API returned it, so its read-only `id` is accepted
// and dropped. Any other field the schema doesn't name is rejected.
const ReadOnlyId = z.string().optional();

/**
 * A new segment as a request sends it. A slug it gives has to be in a slug's format here; the
 * service then checks that a filter can name a segment by it and that no other segment has it.
 * Without one, the service mints the slug from the name.
 */
export const NewSegmentBody = z
  .strictObject({
    id: ReadOnlyId,
    name: SegmentName,
    slug: SegmentSlug.optional(),
    filter: SegmentFilter,
  })
  .transform(({ name, slug, filter }): NewSegment => ({ name, slug, filter }));

/**
 * A change to a segment as a request sends it. It can give the segment's own slug back, and the
 * service rejects any other.
 */
export const SegmentEditBody = z
  .strictObject({
    id: ReadOnlyId,
    name: SegmentName,
    slug: SegmentSlug.optional(),
    filter: SegmentFilter.optional(),
  })
  .transform(({ name, slug, filter }): SegmentEdit => ({ name, slug, filter }));

// Names every field of a segment, so a field added to a segment fails to compile here until the
// response says whether to return it.
const SegmentResource = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  filter: z.string(),
} satisfies Record<keyof Segment, z.ZodType>);
const SegmentsResponse = z.object({ segments: z.array(SegmentResource) });

export const toSegmentsResponse = z
  .array(Segment)
  .transform((segments): z.input<typeof SegmentsResponse> => ({ segments }))
  .pipe(SegmentsResponse);
