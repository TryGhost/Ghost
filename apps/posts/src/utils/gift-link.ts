// All gift links carry a single `utm_campaign` so gift traffic shows up in the
// Top UTM campaigns report while the real referrer (Bluesky, a newsletter, etc.)
// stays intact as the source.
const UTM_CAMPAIGN = 'gift-link';

// Gift links live under a dedicated `/g/` prefix so Fastly's cache-bypass
// boundary is path-based (cleaner than query-param-based) and a random
// `?key=garbage` on a canonical post URL doesn't bust cache.
const ROUTE_PREFIX = 'g';

/**
 * Compose the shareable gift URL: `<siteUrl>/g/<slug>/?key=TOKEN&utm_campaign=gift-link`.
 *
 * The admin already holds the site URL (config) and the post's slug, so the
 * URL is built client-side rather than returned by the API. A trailing slash
 * on the slug matches Ghost's canonical post URLs and avoids a
 * `connect-slashes` 301 hop that would carry the token in `Location`.
 *
 * @param siteUrl - the site's base URL (includes subdirectory if configured),
 *   e.g. `"https://example.com"` or `"https://example.com/blog"`. Trailing
 *   slashes are stripped.
 * @param slug - the post or page slug.
 * @param token - the gift-link token returned by the admin API.
 */
export function buildGiftLinkUrl(siteUrl: string, slug: string, token: string): string {
    if (!siteUrl || !slug || !token) {
        return '';
    }
    const base = siteUrl.replace(/\/+$/, '');
    return `${base}/${ROUTE_PREFIX}/${encodeURIComponent(slug)}/?key=${encodeURIComponent(token)}&utm_campaign=${UTM_CAMPAIGN}`;
}
