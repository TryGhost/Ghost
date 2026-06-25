// Build the public gift-link URL for a post.
//
// Gift links hang off the canonical post URL as a `?gift=<token>` query param
// (Fastly bypasses the cache on the param), so we just append to post.url —
// which already carries any subdirectory and the trailing slash. Returns '' when
// either input is missing so callers can guard the UI.
export function buildGiftLinkUrl(postUrl?: string, token?: string): string {
    if (!postUrl || !token) {
        return '';
    }
    return `${postUrl}?gift=${encodeURIComponent(token)}`;
}
