import type {PaywallAccess} from '@tryghost/kg-default-nodes';

type CardState = {
    access: PaywallAccess | null;
    tiers: string[];
};

type SyncInput = CardState & {
    visibility?: string | null;
    postTiers?: string[];
};

/**
 * What a paywall card's access should become, given the post it sits in.
 *
 * The post is the source of truth: it's what server-side gating reads, and what
 * the publish flow describes. Access is set on the post and the card follows
 * it - adding or removing the card changes nothing about who can read the
 * post.
 *
 * Returns `null` when nothing needs to change, so the caller can run this on
 * every access change without it fighting itself.
 *
 * Public posts are left alone. A paywall in one gates nothing, and a card that
 * kept its old access is more useful than one blanked out - it's what the post
 * goes back to if access is restored.
 *
 * @returns the values to write, or null when the card already matches
 */
export function nextPaywallCardAccess({access, tiers, visibility, postTiers = []}: SyncInput): CardState | null {
    if (!visibility || visibility === 'public') {
        return null;
    }

    const nextTiers = visibility === 'tiers' ? [...postTiers] : [];

    // compared by membership rather than order - the two lists are built from
    // different sources and neither promises a sort
    const tiersMatch = tiers.length === nextTiers.length && nextTiers.every(tier => tiers.includes(tier));

    if (access === visibility && tiersMatch) {
        return null;
    }

    return {access: visibility as PaywallAccess, tiers: nextTiers};
}
