/**
 * Who is asking, in the only terms that decide what they may see or change.
 *
 * Not which user, but which door they came through. Staff reaching a member
 * through the Admin API and a member reaching their own record through Portal are
 * asking different questions about the same fields, and the answers will differ
 * per field once a publisher can say so. Naming the door gives that decision
 * somewhere to live.
 *
 * `internal` is neither: an importer, a value collected at checkout, a job. Those
 * act on nobody's behalf and are bounded by whatever set them off rather than by
 * who is looking.
 *
 * A member's own entry carries no id. Which member is asking is already settled by
 * the query, which is scoped to them, so repeating it here would be a second answer
 * to a question that is already decided and could disagree with the first.
 */
export type Audience = { entry: 'admin' } | { entry: 'members' } | { entry: 'internal' };

export const ADMIN: Audience = { entry: 'admin' };
export const MEMBERS: Audience = { entry: 'members' };
export const INTERNAL: Audience = { entry: 'internal' };

/**
 * Which of the site's fields this audience may see.
 *
 * Every field, whichever door they came through. Written as a function rather than
 * left unwritten so that when a publisher can mark a field as staff only, one
 * function changes and every caller is already asking.
 */
export function readableFields<T>(_audience: Audience, fields: T[]): T[] {
  return fields;
}

/**
 * Whether this audience may write this field.
 *
 * Also total today. Kept separate from `readableFields` because the asymmetry to
 * expect is a field a member may read but not change, which one combined
 * permission could not express.
 */
export function canWrite(_audience: Audience, _field: { key: string }): boolean {
  return true;
}
