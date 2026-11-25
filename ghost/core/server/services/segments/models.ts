import { z } from 'zod';
import { maxBytes } from '../../lib/db-types/text';

/** What identifies a segment in the API. Callers treat it as opaque. */
export const SegmentId = z.string().brand('SegmentId');
export type SegmentId = z.infer<typeof SegmentId>;

/** The most characters a segment's name can have, counted after trimming. */
export const MAX_NAME_LENGTH = 191;

/** A segment's name as a request gives it: trimmed, not empty, and not too long. */
export const SegmentName = z
  .string({ error: 'Name must be a string' })
  .trim()
  .min(1, { error: 'Name cannot be empty' })
  .refine((name) => [...name].length <= MAX_NAME_LENGTH, {
    error: `Name cannot be longer than ${MAX_NAME_LENGTH} characters`,
  })
  .brand('SegmentName');
export type SegmentName = z.infer<typeof SegmentName>;

/** The most bytes a segment's filter can have, which is what the table's text column holds. */
export const MAX_FILTER_BYTES = 65535;

/**
 * The NQL filter that selects a segment's members. It isn't checked against the members'
 * fields, so any filter Admin can save is accepted.
 */
export const SegmentFilter = z
  .string({ error: 'Filter must be a string' })
  .min(1, { error: 'Filter cannot be empty' })
  .refine(maxBytes(MAX_FILTER_BYTES), {
    error: `Filter cannot be longer than ${MAX_FILTER_BYTES} bytes`,
  })
  .brand('SegmentFilter');
export type SegmentFilter = z.infer<typeof SegmentFilter>;

/** A named filter over members. */
export const Segment = z.object({
  id: SegmentId,
  name: z.string(),
  filter: z.string(),
});
export type Segment = z.infer<typeof Segment>;
