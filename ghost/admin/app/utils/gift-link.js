// Whether the current user can copy a gift link for the given post/page.
//
// Requires the giftLinks flag, a user who can manage links
// (Owner/Administrator/Editor/Super Editor), and a published, gated (non-public)
// post/page.
//
// The gift-link URL itself is built on the React side (the modal owns it), so
// this util only decides whether to show the entry point.
export function canCopyGiftLink({feature, user, post} = {}) {
    if (!feature || !feature.giftLinks || !post) {
        return false;
    }
    const canManage = Boolean(user && (user.isAdmin || user.isEitherEditor));
    const eligible = Boolean(post.isPublished && post.visibility && post.visibility !== 'public');
    return canManage && eligible;
}
