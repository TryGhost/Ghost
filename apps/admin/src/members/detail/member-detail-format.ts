export interface MemberGeolocation {
    country_code?: string;
    country?: string;
    region?: string;
    city?: string;
}

/**
 * The members API returns `geolocation` as a JSON-encoded string (not a parsed
 * object). Parse it defensively — a malformed or non-object payload yields null
 * rather than throwing.
 *
 * (The members list has its own parse+format helper in `members-list-item.tsx`.
 * They diverge in both the fallback string — the list says "Unknown", the detail
 * screen matches Ember's "Unknown location" — and the control flow (the list also
 * derives an `isKnown` flag for muted styling), so they're kept separate for now.
 * A shared parser is a reasonable future cleanup.)
 */
export function parseMemberGeolocation(raw: string | null | undefined): MemberGeolocation | null {
    if (!raw) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        // Reject non-objects and arrays (arrays are `typeof 'object'`) so the guard is honest.
        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Human-readable member location, mirroring the Ember member-details template:
 * US members with a region show "Region, US"; everyone else shows their country;
 * anything missing falls back to "Unknown location".
 */
export function formatMemberLocation(rawGeolocation: string | null | undefined): string {
    const geo = parseMemberGeolocation(rawGeolocation);

    if (!geo) {
        return 'Unknown location';
    }

    if (geo.country_code === 'US' && geo.region) {
        return `${geo.region}, US`;
    }

    return geo.country || 'Unknown location';
}

/**
 * The signup referrer source for the "Signup info" block. Members created from the
 * admin carry the placeholder source "Created manually", which the Ember screen
 * hides — so we return null for it (and for any empty source).
 */
export function getMemberReferrerSource(attribution: {referrer_source?: string | null} | null | undefined): string | null {
    const source = attribution?.referrer_source;

    if (!source || source === 'Created manually') {
        return null;
    }

    return source;
}
