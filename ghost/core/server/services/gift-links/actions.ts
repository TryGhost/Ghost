import type { ActionKind } from '../../lib/action-log/action-log';

/**
 * A post's gift link being added, reset or revoked. The resource is the post, as a link has no
 * id of its own, and revoking every link at once belongs to no post.
 */
export const giftLinkActions = {
  resourceType: 'gift_link',
  table: 'posts',
  // Resetting replaces the post's link, which reads as an edit named for what it did.
  actionNames: { reset: 'edited' },
} as const satisfies ActionKind;
