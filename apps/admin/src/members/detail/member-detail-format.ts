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
 * An address value as one readable line for the custom fields card:
 * "1 Main St, 12 apt B, New York, NY 00001, US". State and postal code pair
 * up the way people write them; whatever sub-fields are missing simply drop
 * out, so a partial address still reads naturally.
 */
export function formatAddressValue(address: Partial<Record<'line1' | 'line2' | 'city' | 'state' | 'postal_code' | 'country', string>>): string {
    const statePostal = [address.state, address.postal_code].filter(Boolean).join(' ');
    return [address.line1, address.line2, address.city, statePostal, address.country]
        .filter(Boolean)
        .join(', ');
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
