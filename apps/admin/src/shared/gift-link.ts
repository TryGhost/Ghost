import { hasAdminAccess, isEditorUser } from '@tryghost/admin-x-framework/api/users';

/**
 * Whether the current user may share a gift link for this post.
 *
 * Ported from `apps/ember-admin/app/utils/gift-link.js`, which the Ember
 * context menu imports. Both implementations read this rule, so the entry
 * point can't appear on one side of the flag and not the other.
 *
 * Two halves: a user senior enough to hand out access, and a post that
 * actually withholds it. A public post has nothing to gift.
 *
 * Only decides whether to *offer* the action — the URL itself is built by the
 * modal.
 */

/** Whatever the framework's role helpers accept, so the shapes can't drift. */
type GiftLinkUser = Parameters<typeof hasAdminAccess>[0];

interface GiftLinkPost {
  status?: string;
  visibility?: string;
}

export function canCopyGiftLink({
  user,
  post,
}: {
  user?: GiftLinkUser | null;
  post?: GiftLinkPost | null;
}): boolean {
  if (!user || !post) {
    return false;
  }

  // Ember's `isAdmin || isEitherEditor`. Two traps: `isAdmin` there means
  // Owner *or* Administrator, which is `hasAdminAccess` here and not
  // `isAdminUser`; and `isEditorUser` already covers Super Editor, so
  // Ember's `or('isEditor', 'isSuperEditor')` is a single call.
  const canManage = hasAdminAccess(user) || isEditorUser(user);

  const isGated =
    post.status === 'published' && Boolean(post.visibility) && post.visibility !== 'public';

  return canManage && isGated;
}
