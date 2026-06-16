// Shared helpers for the gift-link editor surfaces (post-settings-menu and the
// posts-list context menu) so the URL shape and eligibility rules stay in sync.

// Build the public gift-link URL for a post.
//
// Gift links live at /g/<slug>/?key=TOKEN — a dedicated path prefix (not a
// `?gift=` param on the canonical URL) so Fastly's cache bypass is path-based
// and slug-change behaviour matches the rest of Ghost. The blog URL carries any
// subdirectory; the trailing slash on the slug matches Ghost's canonical post
// URLs. Returns '' when any input is missing so callers can guard the UI.
export function giftLinkUrl({blogUrl, slug, token} = {}) {
    if (!blogUrl || !slug || !token) {
        return '';
    }
    const base = blogUrl.replace(/\/+$/, '');
    return `${base}/g/${encodeURIComponent(slug)}/?key=${encodeURIComponent(token)}&utm_campaign=gift-link`;
}

// Whether the current user can copy a gift link for the given post.
//
// Requires the giftLinks flag, a user who can manage links
// (Owner/Administrator/Editor/Super Editor/Author), and a published, gated
// (non-public) post/page. Authors are limited to their own posts server-side;
// in the editor they only ever open posts they can edit, so the role check is
// sufficient for surfacing the control here.
export function canCopyGiftLink({feature, user, post} = {}) {
    if (!feature || !feature.giftLinks || !post) {
        return false;
    }
    const canManage = Boolean(user && (user.isAdmin || user.isEitherEditor || user.isAuthor));
    const eligible = Boolean(post.isPublished && post.visibility && post.visibility !== 'public');
    return canManage && eligible;
}
