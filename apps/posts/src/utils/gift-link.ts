// All gift links carry a single `utm_campaign` so gift traffic shows up in the
// Top UTM campaigns report while the real referrer (Bluesky, a newsletter, etc.)
// stays intact as the source.
const UTM_CAMPAIGN = 'gift-link';

/**
 * Compose the shareable gift URL from a post's canonical URL and a gift token.
 * The admin already holds `post.url`, so the URL is built client-side rather
 * than returned by the API.
 */
export function buildGiftLinkUrl(postUrl: string, token: string): string {
    if (!postUrl || !token) {
        return '';
    }
    const separator = postUrl.includes('?') ? '&' : '?';
    return `${postUrl}${separator}gift=${encodeURIComponent(token)}&utm_campaign=${UTM_CAMPAIGN}`;
}
