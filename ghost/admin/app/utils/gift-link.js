// Whether the current user can copy a gift link for the given post/page.
//
// Requires the giftLinks flag, a user who can manage links
// (Owner/Administrator/Editor/Super Editor/Author), and a published, gated
// (non-public) post/page. Authors are limited to their own posts server-side;
// in the lists they only see posts they can edit, so the role check is
// sufficient for surfacing the control here.
//
// The gift-link URL itself is built on the React side (the modal owns it), so
// this util only decides whether to show the entry point.
export function canCopyGiftLink({feature, user, post} = {}) {
    if (!feature || !feature.giftLinks || !post) {
        return false;
    }
    const canManage = Boolean(user && (user.isAdmin || user.isEitherEditor || user.isAuthor));
    const eligible = Boolean(post.isPublished && post.visibility && post.visibility !== 'public');
    return canManage && eligible;
}
