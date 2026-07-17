// Build the public gift-link URL: a `?gift=<token>` query param appended to the
// canonical post URL (which already carries any subdirectory and trailing
// slash). Returns '' when either input is missing so callers can guard the UI.
export function buildGiftLinkUrl(postUrl?: string, token?: string): string {
    if (!postUrl || !token) {
        return '';
    }
    return `${postUrl}?gift=${encodeURIComponent(token)}`;
}

// The access label shown in the share copy ("...full access to this <label>
// post"), keyed off the post's visibility.
const GIFT_ACCESS_LABELS: Record<string, string> = {
    members: 'members-only',
    paid: 'paid-members-only',
    tiers: 'paid-members-only'
};

export function giftAccessLabel(visibility?: string): string {
    return (visibility && GIFT_ACCESS_LABELS[visibility]) || '';
}
