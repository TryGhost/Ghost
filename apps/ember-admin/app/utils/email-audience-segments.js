/**
 * The two halves of a gated post's email audience.
 *
 * Both halves are ordinary recipient segments - the same strings the recipient
 * checkboxes have always produced - so the filter this view writes is
 * indistinguishable from one built the old way, and an email saved by either
 * reads back into either. What changes is only how they're named: by what lands
 * in the inbox rather than by which members they are.
 */

// Everyone who can't read past the gate lands on the paywall, but free members
// are the only such group the recipient controls can name on their own. Other
// tiers stay reachable through the existing "specific people" selection, as
// they always have been.
export const PREVIEW_SEGMENT = 'status:free';

/**
 * Splits a comma-joined segment list into its parts. The full-post segment is
 * itself a list for tier-gated posts, so toggling it means moving every part at
 * once.
 *
 * @param {string} segment
 * @returns {Array<string>}
 */
export function segmentParts(segment) {
    return (segment || '').split(',').map(part => part.trim()).filter(Boolean);
}

/**
 * Whether the split view applies to this post.
 *
 * It only earns its place when a paywall card actually gates the content: that
 * card is what creates a preview worth sending, and without one the ordinary
 * recipient controls already say everything there is to say. Public and
 * members-only posts have no audience without access, so they never split.
 *
 * @param {object} post
 * @returns {boolean}
 */
export function hasEmailAudienceSplit(post) {
    const visibility = post?.visibility;

    if (visibility !== 'paid' && visibility !== 'tiers') {
        return false;
    }

    return !!post?.hasPaywallCard;
}
