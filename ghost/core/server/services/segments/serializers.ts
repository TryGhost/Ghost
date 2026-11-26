import { z } from 'zod';
import { ObjectIdSchema } from '../../lib/db-types/object-id';
import { Segment, SegmentFilter, SegmentName, SegmentSlug } from './models';
import type { NewSegment, SegmentEdit } from './service';

/** The segment a route names. A malformed id is rejected rather than looked up. */
export const SegmentRoute = z.object({ id: ObjectIdSchema });

// A request can send a segment back as the API returned it, so the fields the server sets are
// accepted and dropped. Any other field the schema doesn't name is rejected. A field added to a
// segment that a request can't give fails to compile here until it is listed.
const readOnlyFields = {
  id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
} satisfies Record<Exclude<keyof Segment, keyof NewSegment>, z.ZodType>;

/**
 * A new segment as a request sends it. A slug it gives has to be in a slug's format here; the
 * service then checks that a filter can name a segment by it and that no other segment has it.
 * Without one, the service mints the slug from the name.
 */
export const NewSegmentBody = z
  .strictObject({
    ...readOnlyFields,
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
    ...readOnlyFields,
    name: SegmentName,
    slug: SegmentSlug.optional(),
    filter: SegmentFilter.optional(),
  })
  .transform(({ name, slug, filter }): SegmentEdit => ({ name, slug, filter }));

// Only each segment's id is read, so segments can be sent back as the API returns them.
export const SegmentOrderBody = z
  .object({ segments: z.array(z.object({ id: z.string({ error: 'Id must be a string' }) })) })
  .transform(({ segments }) => segments.map(({ id }) => id));

// Names every field of a segment, so a field added to a segment fails to compile here until the
// response says whether to return it.
const SegmentResource = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  filter: z.string(),
  // Each is sent as an ISO 8601 time in UTC, as other resources' times are.
  created_at: z.date(),
  updated_at: z.date(),
} satisfies Record<keyof Segment, z.ZodType>);
const SegmentsResponse = z.object({ segments: z.array(SegmentResource) });

export const toSegmentsResponse = z
  .array(Segment)
  .transform((segments): z.input<typeof SegmentsResponse> => ({ segments }))
  .pipe(SegmentsResponse);
