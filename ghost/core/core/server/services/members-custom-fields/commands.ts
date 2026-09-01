import { z } from 'zod';
import { WrittenBy } from './schema';

/**
 * Setting the values a member holds in the fields a publisher defined.
 *
 * Named as one thing because both surfaces that write these — staff editing a
 * member, and a member editing themselves — are doing the same act and have to say
 * the same things about it. Carrying it as a command keeps who is writing attached
 * to what is being written, rather than the two being passed around separately and
 * paired up correctly by each caller.
 *
 * Applying one happens in two steps, which `values-service` owns: what a write
 * implies is worked out before anything is written, so a value the catalog refuses
 * fails before the member's record is touched. That matters because the member
 * write it sits beside is not something a transaction can undo — it reconciles
 * subscriptions with Stripe and dispatches events — so the only safe place to
 * refuse is before any of it starts.
 */

export const UpdateMetafields = z.object({
  memberId: z.string(),
  /** As the wire spells it: keyed by namespace, then by field. */
  values: z.unknown(),
  /**
   * Who is making the change. Required and never defaulted: a writer that could be
   * inferred is one a new caller inherits by accident, and the answer is stored
   * against every value it writes.
   */
  writtenBy: WrittenBy,
});
export type UpdateMetafields = z.infer<typeof UpdateMetafields>;
