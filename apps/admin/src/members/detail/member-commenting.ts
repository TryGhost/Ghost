import type { Member } from '@tryghost/admin-x-framework/api/members';

/**
 * True when the member currently can't comment. Gated on `can_comment`, NOT on
 * `commenting.disabled`. The distinction matters when a temporary disable
 * expires: `commenting.disabled` stays truthy, but the server flips
 * `can_comment` back to `true`.
 *
 * Missing / undefined `can_comment` (legacy members) → treat as enabled.
 */
export function isMemberCommentingDisabled(member: Pick<Member, 'can_comment'>): boolean {
  return member.can_comment === false;
}

/**
 * The Actions-menu label reflects the *next* transition. If the member is
 * currently blocked from commenting the menu offers to enable them, and vice
 * versa.
 */
export function getMemberCommentingActionLabel(member: Pick<Member, 'can_comment'>): string {
  return isMemberCommentingDisabled(member) ? 'Enable commenting' : 'Disable commenting';
}
