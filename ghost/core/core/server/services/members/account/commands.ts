import { z } from 'zod';

/**
 * What a member may ask Ghost to change about themselves.
 *
 * A command per thing a member can do, rather than one list of writable columns:
 * what a member may send is a property of the request they are making, and the
 * next one — setting their own metafields — accepts a different body under
 * different rules.
 *
 * The read side has no counterpart here on purpose. What a member is shown is
 * expressed by `queries.ts` and `models.ts`, so a list restating it would be a
 * copy that nothing checks.
 */

/**
 * Anything a member sends that is not named here is dropped rather than refused,
 * which is what an object schema does with unknown keys anyway.
 *
 * Dropping rather than refusing is deliberate, and `email` is the precedent: a
 * member's own response carries it, a member sending it back has it ignored, and
 * changing it goes through a route of its own that verifies the new address by
 * magic link. A field a member may change under different terms gets its own
 * route rather than a condition inside this one.
 *
 * The values are unknown rather than typed. Typing them would start refusing a
 * wrongly-typed value that Ghost currently accepts and coerces, which is a change
 * to what the API does and belongs in a change that says so.
 */
export const UpdateAccount = z.object({
  name: z.unknown().optional(),
  expertise: z.unknown().optional(),
  subscribed: z.unknown().optional(),
  newsletters: z.unknown().optional(),
  enable_comment_notifications: z.unknown().optional(),
  enable_updates_and_announcements: z.unknown().optional(),
  /**
   * The extra fields a publisher defined, keyed by namespace.
   *
   * Here rather than on a route of its own, which is how staff already set the
   * same values: `PUT /members/:id` carries `metafields` beside `name`. A
   * member's account panel is one form with one Save, and splitting the write
   * would make it two requests with a half-succeeded state to explain.
   *
   * Unlike the fields above, a metafield naming something nobody defined is
   * refused rather than ignored. An unrecognised key at the top level is a
   * client sending more than this endpoint reads; a named field that does not
   * exist is a client that believes something false, and saying so is more
   * use than silence. What a field accepts is the business of the catalog that
   * defines it, which validates the values and names the address it refused.
   */
  metafields: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateAccount = z.infer<typeof UpdateAccount>;
