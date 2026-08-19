import {ALL_MEMBERS_SEGMENT, FREE_MEMBERS_SEGMENT, NO_MEMBERS_SEGMENT} from '../../utils/visibility.js';
import type {PaywallAccess} from './PaywallV2Node.js';

/**
 * The member segment that should *see* the paywall, i.e. the complement of the
 * segment that has access to the post beyond it.
 *
 * - `members`: every logged-in member has access, so no member sees the paywall
 * - `paid`: free members see it
 * - `tiers`: members outside the selected tiers see it (De Morgan complement,
 *   matching `getNegatedTierFilter` in ghost/core's email-renderer)
 */
export function getPaywallMemberSegment(access: PaywallAccess | null, tiers: string[] = []): string {
    switch (access) {
    case 'paid':
        return FREE_MEMBERS_SEGMENT;
    case 'tiers':
        // no tiers selected is a misconfigured paywall - nobody has access
        return tiers.length ? tiers.map(slug => `product:-'${slug}'`).join('+') : ALL_MEMBERS_SEGMENT;
    case 'members':
    default:
        return NO_MEMBERS_SEGMENT;
    }
}

/**
 * The post `visibility` value that matches a paywall card's access setting.
 * The host keeps `post.visibility` in sync with this so server-side gating
 * continues to work off the post rather than the card.
 */
export function getPaywallPostVisibility(access: PaywallAccess | null): 'members' | 'paid' | 'tiers' {
    return access ?? 'members';
}
