/**
 * Names who lands on the paywall rather than the full post when it goes up on
 * the site. The caller composes the sentence, so "paywall" can carry a preview
 * of the author's own card.
 *
 * Returns null when nobody is stopped - the post is public and there is no
 * paywall to describe.
 *
 * The mirror of `paywallPreviewAudience`, which answers the same question for
 * the send. That one has to work out which recipients happen to lack access;
 * the site has no such split, so the answer falls straight out of visibility.
 *
 * @param {object} post - the post being published
 * @returns {string|null} lowercase, e.g. 'free members and public visitors'
 */
export default function webPaywallAudience(post) {
    const visibility = post?.visibility || 'public';

    if (visibility === 'members') {
        return 'public visitors';
    }

    if (visibility === 'paid') {
        return 'free members and public visitors';
    }

    if (visibility === 'tiers') {
        const tierNames = (post?.tiers || []).map(tier => tier.name).filter(Boolean);

        // named where we can - "the selected tiers" is only reached by a post
        // gated on tiers that hasn't picked any, which the access chip prevents
        // by seeding the first tier when the author picks tier-gating
        return tierNames.length
            ? `members outside ${tierNames.join(', ')}`
            : 'members outside the selected tiers';
    }

    return null;
}
