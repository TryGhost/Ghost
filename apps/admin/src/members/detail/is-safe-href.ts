/**
 * Only http(s), site-relative (`/...`), and internal hash (`#/...`) URLs are
 * safe to drop into an anchor `href`. Anything else — most importantly
 * `javascript:` — is rejected so a crafted attribution URL from the events
 * endpoint (or a signup Referer) can't turn into click-to-execute in the admin.
 * React does NOT sanitize `href` for us.
 *
 * Extracted so both the activity feed and the member-detail sidebar (which
 * both render attribution URLs supplied by external signup traffic) validate
 * against the same rule set.
 */
export function isSafeHref(url: string | undefined | null): url is string {
    if (!url) {
        return false;
    }
    return /^(https?:\/\/|\/|#\/)/i.test(url);
}
