// Platform detection moved to shared/ua.ts (reused by the shared magic-link view).

// Price/date formatting moved to shared/pricing.ts (reused by the offers chunk);
// re-exported here so existing members imports stay stable.
export {formatPrice, formatDate} from '../../shared/pricing';

import type {SiteState} from '../../types';

function siteDomain(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
}

/** First error message from a members-API error envelope, or the fallback. */
export async function readError(res: Response, fallback: string): Promise<string> {
    try {
        const data = (await res.json()) as {errors?: Array<{message?: string}>};
        return data?.errors?.[0]?.message ?? fallback;
    } catch {
        return fallback;
    }
}

/** Support contact email for the email-FAQ pages. Ports helpers.js#getSupportAddress. */
export function getSupportAddress(site: SiteState): string {
    return site.support_email_address || `noreply@${siteDomain(site.url)}`;
}

/** Default newsletter sender email. Ports helpers.js#getDefaultNewsletterSender. */
export function getDefaultNewsletterSender(site: SiteState): string {
    const firstSender = (site.newsletters ?? []).find(n => n.status !== 'archived' && n.sender_email)?.sender_email;
    return firstSender || site.default_email_address || `noreply@${siteDomain(site.url)}`;
}
