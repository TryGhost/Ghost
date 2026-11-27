import { hasAdminAccess, isEditorUser } from '@tryghost/admin-x-framework/api/users';

/**
 * Whether the current user may share a gift link for this post.
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

  // Owner or Administrator (`hasAdminAccess`, not `isAdminUser`), or Editor;
  // `isEditorUser` already covers Super Editor.
  const canManage = hasAdminAccess(user) || isEditorUser(user);

  const isGated =
    post.status === 'published' && Boolean(post.visibility) && post.visibility !== 'public';

  return canManage && isGated;
}
